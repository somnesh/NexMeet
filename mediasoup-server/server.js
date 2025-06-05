require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const { v2: cloudinary } = require("cloudinary");

const {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
} = require("microsoft-cognitiveservices-speech-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require("./middleware/verrifyToken");
const otpRoutes = require("./routes/otpRoutes");
const {
  otpRateLimiter,
  verificationRateLimiter,
} = require("./middleware/rateLimiter");

// Initialize Express app
const app = express();
app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL, process.env.SERVER_URL],
  })
);
app.use(express.json());
app.use(express.static("/mediasoup-server/public"));

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: [process.env.CLIENT_URL, process.env.SERVER_URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ICE servers configuration (STUN only for mesh)
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// Map of rooms and their peers (replacing mediasoup rooms)
const rooms = new Map();

// Room class for mesh architecture
class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.peers = new Map();
    this.createdAt = new Date();
  }

  addPeer(socketId, peerData) {
    this.peers.set(socketId, {
      id: socketId,
      ...peerData,
      connections: new Set(), // Track P2P connections
      joinedAt: new Date(),
    });
  }

  removePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      // Clean up connections
      peer.connections.forEach((peerId) => {
        const connectedPeer = this.peers.get(peerId);
        if (connectedPeer) {
          connectedPeer.connections.delete(socketId);
        }
      });
    }
    this.peers.delete(socketId);
  }

  getPeers() {
    return Array.from(this.peers.values());
  }

  getOtherPeers(excludeSocketId) {
    return Array.from(this.peers.values()).filter(
      (peer) => peer.id !== excludeSocketId
    );
  }

  addConnection(fromSocketId, toSocketId) {
    const fromPeer = this.peers.get(fromSocketId);
    const toPeer = this.peers.get(toSocketId);

    if (fromPeer && toPeer) {
      fromPeer.connections.add(toSocketId);
      toPeer.connections.add(fromSocketId);
    }
  }

  isEmpty() {
    return this.peers.size === 0;
  }
}

// Create or get room
function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Room(roomId));
    console.log(`Created new room: ${roomId}`);
  }
  return rooms.get(roomId);
}

// Socket.IO connection handling
io.on("connection", async (socket) => {
  console.log("New client connected:", socket.id);

  // Log all incoming events
  socket.onAny((event, ...args) => {
    console.log(`[${socket.id}] Received event "${event}"`, args);
  });

  // Store data related to this peer
  let peerData = {
    socket,
    roomId: null,
    userId: null,
    name: null,
  };

  // Handle join room request - keeping same interface as mediasoup
  socket.on("joinRoom", async ({ roomId, userId, name }, callback) => {
    try {
      console.log(`${socket.id} joining room ${roomId} as ${name}`);

      // Create or get room
      const room = getOrCreateRoom(roomId);
      peerData.roomId = roomId;
      peerData.userId = userId;
      peerData.name = name;

      // Store peer in room
      room.addPeer(socket.id, { userId, name });

      // Join socket room for broadcasting
      socket.join(roomId);

      // Get list of other peers
      const otherPeers = room.getOtherPeers(socket.id);

      // Notify other peers in the room
      socket.to(roomId).emit("peerJoined", {
        peerId: socket.id,
        userId,
        name,
      });

      // Send ICE servers and peer list (modified to include iceServers instead of rtpCapabilities)
      callback({
        iceServers: ICE_SERVERS, // Changed from rtpCapabilities
        peerList: otherPeers.map((peer) => ({
          id: peer.id,
          userId: peer.userId,
          name: peer.name,
        })),
      });

      console.log(`Room ${roomId} now has ${room.peers.size} participants`);
    } catch (error) {
      console.error("Error joining room:", error);
      callback({ error: error.message });
    }
  });

  // Handle WebRTC transport creation - now returns P2P connection info
  socket.on("createWebRtcTransport", async ({ direction }, callback) => {
    try {
      if (!peerData.roomId) {
        throw new Error("Not in a room");
      }

      // For mesh, we don't create server-side transports
      // Instead, we provide ICE servers for P2P connections
      const transportId = `transport_${socket.id}_${Date.now()}`;

      callback({
        id: transportId,
        iceServers: ICE_SERVERS,
        // Simplified parameters for P2P
        iceParameters: { usernameFragment: "mesh", password: "p2p" },
        iceCandidates: [],
        dtlsParameters: { role: "auto", fingerprints: [] },
      });
    } catch (error) {
      console.error("Error creating WebRTC transport:", error);
      callback({ error: error.message });
    }
  });

  // Handle connect transport - simplified for mesh
  socket.on(
    "connectTransport",
    async ({ transportId, dtlsParameters }, callback) => {
      try {
        if (!peerData.roomId) {
          throw new Error("Not in a room");
        }

        // In mesh, connection is handled by WebRTC directly
        callback({ connected: true });
      } catch (error) {
        console.error("Error connecting transport:", error);
        callback({ error: error.message });
      }
    }
  );

  // Handle WebRTC signaling for mesh connections
  socket.on("webrtc-offer", ({ targetPeerId, offer }) => {
    console.log(`Forwarding offer from ${socket.id} to ${targetPeerId}`);
    socket.to(targetPeerId).emit("webrtc-offer", {
      fromPeerId: socket.id,
      offer,
    });
  });

  socket.on("webrtc-answer", ({ targetPeerId, answer }) => {
    console.log(`Forwarding answer from ${socket.id} to ${targetPeerId}`);
    socket.to(targetPeerId).emit("webrtc-answer", {
      fromPeerId: socket.id,
      answer,
    });
  });

  socket.on("webrtc-ice-candidate", ({ targetPeerId, candidate }) => {
    console.log(
      `Forwarding ICE candidate from ${socket.id} to ${targetPeerId}`
    );
    socket.to(targetPeerId).emit("webrtc-ice-candidate", {
      fromPeerId: socket.id,
      candidate,
    });
  });

  // Modified produce handler - now just notifies about stream availability
  socket.on(
    "produce",
    async ({ transportId, kind, rtpParameters, appData }, callback) => {
      try {
        if (!peerData.roomId) {
          throw new Error("Not in a room");
        }

        const room = rooms.get(peerData.roomId);
        const producerId = `producer_${socket.id}_${kind}_${Date.now()}`;

        // Notify all peers in the room about new producer
        socket.to(peerData.roomId).emit("newProducer", {
          producerId,
          peerId: socket.id,
          kind,
        });

        callback({ id: producerId });
      } catch (error) {
        console.error("Error producing:", error);
        callback({ error: error.message });
      }
    }
  );

  // Modified consume handler - initiates P2P connection
  socket.on(
    "consume",
    async ({ transportId, producerId, rtpCapabilities }, callback) => {
      try {
        if (!peerData.roomId) {
          throw new Error("Not in a room");
        }

        const room = rooms.get(peerData.roomId);

        // Extract producer peer ID from producerId
        const producerPeerId = producerId.split("_")[1];

        if (!room.peers.has(producerPeerId)) {
          throw new Error("Producer peer not found");
        }

        const consumerId = `consumer_${socket.id}_${Date.now()}`;

        // Track the connection
        room.addConnection(socket.id, producerPeerId);

        callback({
          id: consumerId,
          producerId,
          kind: producerId.includes("video") ? "video" : "audio",
          rtpParameters: {}, // Empty for P2P
          producerPeerId,
        });
      } catch (error) {
        console.error("Error consuming:", error);
        callback({ error: error.message });
      }
    }
  );

  // Handle resume consumer - simplified for mesh
  socket.on("resumeConsumer", async ({ consumerId }, callback) => {
    try {
      // In mesh, resuming is handled by WebRTC directly
      callback({ resumed: true });
    } catch (error) {
      console.error("Error resuming consumer:", error);
      callback({ error: error.message });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    if (peerData.roomId) {
      const room = rooms.get(peerData.roomId);
      if (room) {
        // Remove peer from room
        room.removePeer(socket.id);

        // Notify other peers in the room
        socket.to(peerData.roomId).emit("peerLeft", {
          peerId: socket.id,
          userId: peerData.userId,
          name: peerData.name,
        });

        // If room is empty, clean it up
        if (room.isEmpty()) {
          rooms.delete(peerData.roomId);
          console.log(`Room ${peerData.roomId} closed - no more peers`);
        }
      }
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Import OTP service and routes
app.use("/api/otp/request", otpRateLimiter);
app.use("/api/otp/verify", verificationRateLimiter);
app.use("/api/otp", otpRoutes);

// API endpoint to get room info
app.get("/api/rooms/:roomId", (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json({
    roomId: room.roomId,
    participantCount: room.peers.size,
    participants: room.getPeers().map((peer) => ({
      id: peer.id,
      userId: peer.userId,
      name: peer.name,
      joinedAt: peer.joinedAt,
    })),
  });
});

// API endpoint to get all rooms
app.get("/api/rooms", (req, res) => {
  const roomList = Array.from(rooms.values()).map((room) => ({
    roomId: room.roomId,
    participantCount: room.peers.size,
    createdAt: room.createdAt,
  }));

  res.json({ rooms: roomList });
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Azure Speech Service configuration
const speechConfig = SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY,
  process.env.AZURE_SPEECH_REGION
);

// Convert Cloudinary video URL to audio WAV URL
function getCloudinaryAudioUrl(videoUrl) {
  // Example: https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4
  // Convert to: https://res.cloudinary.com/demo/video/upload/f_wav,q_auto/v1234567890/sample.wav

  const urlParts = videoUrl.split("/upload/");
  if (urlParts.length !== 2) {
    throw new Error("Invalid Cloudinary URL format");
  }

  const baseUrl = urlParts[0];
  const resourcePath = urlParts[1];

  // Add audio transformation parameters
  const audioUrl = `${baseUrl}/upload/f_wav,q_auto/${resourcePath.replace(
    /\.[^.]+$/,
    ".wav"
  )}`;

  return audioUrl;
}

// Download audio file from Cloudinary
async function downloadAudioFile(audioUrl) {
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filename = `audio_${Date.now()}.wav`;
  const filepath = path.join(tempDir, filename);

  const response = await axios({
    method: "GET",
    url: audioUrl,
    responseType: "stream",
  });

  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(filepath));
    writer.on("error", reject);
  });
}

// API endpoint for speech-to-text transcription from Cloudinary URL
app.post("/api/transcribe-from-url", verifyToken, async (req, res) => {
  let audioFilePath = null;
  try {
    const { videoUrl, meetingId, language = "en-US" } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: "No video URL provided" });
    }

    console.log(
      `Starting transcription for meeting ${meetingId} from URL: ${videoUrl}`
    );

    // Convert video URL to audio URL
    const audioUrl = getCloudinaryAudioUrl(videoUrl);
    console.log(`Audio URL: ${audioUrl}`);

    // Download audio file
    audioFilePath = await downloadAudioFile(audioUrl);
    console.log(`Audio file downloaded: ${audioFilePath}`);

    // Configure speech recognition
    speechConfig.speechRecognitionLanguage = language;
    const audioConfig = AudioConfig.fromWavFileInput(
      fs.readFileSync(audioFilePath)
    );
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    // Perform transcription
    const transcription = await performTranscription(recognizer);

    // Clean up downloaded file
    // fs.unlinkSync(audioFilePath);

    res.json({
      success: true,
      meetingId,
      transcription,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({
      error: "Transcription failed",
      details: error.message,
    });
  } finally {
    // Always clean up the downloaded file, even if an error occurred
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      try {
        fs.unlinkSync(audioFilePath);
        console.log(`Temporary audio file deleted: ${audioFilePath}`);
      } catch (deleteError) {
        console.error(
          `Failed to delete temporary file: ${audioFilePath}`,
          deleteError
        );
      }
    }
  }
});

// Helper function for transcription
function performTranscription(recognizer) {
  return new Promise((resolve, reject) => {
    let fullTranscription = "";

    recognizer.recognizing = (s, e) => {
      console.log(`RECOGNIZING: ${e.result.text}`);
    };

    recognizer.recognized = (s, e) => {
      if (e.result.text) {
        fullTranscription += e.result.text + " ";
        console.log(`RECOGNIZED: ${e.result.text}`);
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason}`);
      recognizer.stopContinuousRecognitionAsync();
      // Check if cancellation is due to end of stream (normal completion)
      if (e.reason === 1) {
        // CancellationReason.EndOfStream
        console.log("Recognition completed successfully - end of audio stream");
        resolve(fullTranscription.trim());
      } else {
        // Only reject for actual errors
        reject(new Error(`Recognition canceled: ${e.reason}`));
      }
    };

    recognizer.sessionStopped = (s, e) => {
      console.log("Session stopped");
      recognizer.stopContinuousRecognitionAsync();
      resolve(fullTranscription.trim());
    };

    // Add error handler
    recognizer.speechStartDetected = (s, e) => {
      console.log("Speech start detected");
    };

    recognizer.speechEndDetected = (s, e) => {
      console.log("Speech end detected");
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        console.log("Recognition started successfully");
      },
      (err) => {
        console.error("Failed to start recognition:", err);
        reject(new Error(`Failed to start recognition: ${err}`));
      }
    );
  });
}

// API endpoint for AI-powered meeting summary
app.post("/api/generate-summary", async (req, res) => {
  try {
    if (req.headers["x-client-id"] !== process.env.CLIENT_ID) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { transcription, meetingId } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: "No transcription provided" });
    }

    // Here you can integrate with Azure OpenAI or other AI services
    const summary = await generateMeetingSummary(transcription);

    res.json({
      success: true,
      meetingId,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    res.status(500).json({ error: "Summary generation failed" });
  }
});

// Gemini AI summary generation
async function generateMeetingSummary(transcription) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Please analyze the following meeting transcription and provide a comprehensive summary in JSON format with the following structure:

{
  "title": "Brief meeting title based on content",
  "summary": "Overall summary of the meeting",
  "keyPoints": ["Key point 1", "Key point 2", "..."],
  "actionItems": [
    {
      "task": "Description of action item",
      "assignee": "Person responsible (if mentioned)",
      "deadline": "Deadline if mentioned, otherwise null"
    }
  ],
  "decisions": ["Decision 1", "Decision 2", "..."],
  "participants": ["Participant names mentioned in the transcript"],
  "topics": ["Main topics discussed"],
  "nextSteps": ["Next step 1", "Next step 2", "..."],
  "duration": "Estimated meeting duration based on content"
}

Meeting Transcription:
${transcription}

Please ensure the response is valid JSON format.
`;

    const result = await model.generateContent(prompt);

    console.log("Gemini AI response:", result.response.text());

    const text = result.response.text();

    const cleanedJson = extractAndCleanJson(text);
    console.log("Cleaned JSON:", cleanedJson);

    return cleanedJson;
    // Try to parse the JSON response
    // try {
    //   const summary = JSON.parse(text);
    //   return summary;
    // } catch (parseError) {
    //   console.warn(
    //     "Failed to parse Gemini response as JSON, returning raw text"
    //   );

    //   // Fallback: return a structured response with the raw text
    //   return {
    //     title: "Meeting Summary",
    //     summary: text,
    //     keyPoints: [],
    //     actionItems: [],
    //     decisions: [],
    //     participants: [],
    //     topics: [],
    //     nextSteps: [],
    //     duration: "Unknown",
    //   };
    // }
  } catch (error) {
    console.error("Gemini AI error:", error);
    throw new Error(`AI summary generation failed: ${error.message}`);
  }
}

// Helper function to extract and clean JSON from Gemini response
function extractAndCleanJson(text) {
  let cleaned = text.trim();

  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/```json\s*/g, "");
  cleaned = cleaned.replace(/```\s*$/g, "");
  cleaned = cleaned.replace(/```/g, "");

  // Remove any text before the first {
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  // Remove any text after the last }
  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  // Fix common JSON issues
  cleaned = cleaned.replace(/\n\s*/g, " "); // Remove newlines and extra spaces
  cleaned = cleaned.replace(/,\s*}/g, "}"); // Remove trailing commas before }
  cleaned = cleaned.replace(/,\s*]/g, "]"); // Remove trailing commas before ]

  return cleaned.trim();
}

app.get("/api/cloudinary-signature", verifyToken, async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000); // Current timestamp
  const paramsToSign = {
    timestamp: timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_CLOUD_API_SECRET
  );

  res.json({
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_CLOUD_API,
  });
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API,
  api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
});

app.delete("/api/delete-recording/:publicId", verifyToken, async (req, res) => {
  const { publicId } = req.params;

  console.log("Public ID for deletion:", publicId);

  if (!publicId) {
    return res.status(400).json({ error: "No public ID provided" });
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
    console.log("Cloudinary delete result:", result);

    if (result.result === "ok") {
      return res.json({
        success: true,
        message: "Recording deleted successfully",
      });
    } else {
      return res.status(500).json({ error: "Failed to delete recording" });
    }
  } catch (error) {
    console.error("Error deleting recording:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mesh WebRTC server running on port ${PORT}`);
});

module.exports = {
  app,
  io,
};
