// mediasoup-server.js
const mediasoup = require("mediasoup");
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// MediaSoup variables
let worker;
const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

// Map of rooms and their routers
const rooms = new Map();

// Start MediaSoup worker
async function startMediasoup() {
  worker = await mediasoup.createWorker({
    logLevel: "debug",
    logTags: [
      "info",
      "ice",
      "dtls",
      "rtp",
      "srtp",
      "rtcp",
      "rtx",
      "bwe",
      "score",
      "simulcast",
      "svc",
      "sctp",
    ],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  console.log(`MediaSoup worker created with PID ${worker.pid}`);

  worker.on("died", () => {
    console.error("MediaSoup worker died, exiting...");
    process.exit(1);
  });
}

// Create a router for a room
async function createRoom(roomId) {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const router = await worker.createRouter({ mediaCodecs });
  const room = {
    router,
    peers: new Map(),
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };

  rooms.set(roomId, room);
  return room;
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
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };

  // Handle join room request
  socket.on("joinRoom", async ({ roomId, userId, name }, callback) => {
    try {
      // Create or get room
      const room = await createRoom(roomId);
      peerData.roomId = roomId;

      // Store peer in room
      room.peers.set(socket.id, {
        id: socket.id,
        userId,
        name,
        transports: [],
        producers: [],
        consumers: [],
      });

      // Get router RTP capabilities
      const rtpCapabilities = room.router.rtpCapabilities;

      // Notify other peers in the room
      socket.join(roomId);
      socket.to(roomId).emit("peerJoined", {
        peerId: socket.id,
        userId,
        name,
      });

      // Send list of current peers to the new peer
      const peerList = Array.from(room.peers.values())
        .filter((peer) => peer.id !== socket.id)
        .map((peer) => ({
          id: peer.id,
          userId: peer.userId,
          name: peer.name,
        }));

      callback({ rtpCapabilities, peerList });
    } catch (error) {
      console.error("Error joining room:", error);
      callback({ error: error.message });
    }
  });

  // Handle create WebRTC transport request
  socket.on("createWebRtcTransport", async ({ direction }, callback) => {
    try {
      if (!peerData.roomId) {
        throw new Error("Not in a room");
      }

      const room = rooms.get(peerData.roomId);

      // Create WebRTC transport
      const transport = await room.router.createWebRtcTransport({
        listenIps: [
          {
            ip: "0.0.0.0",
            announcedIp: process.env.ANNOUNCED_IP || "127.0.0.1",
          },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
      });

      // Store transport
      room.transports.set(transport.id, transport);
      peerData.transports.set(transport.id, transport);

      // Add transport to peer data in room
      const peer = room.peers.get(socket.id);
      peer.transports.push(transport.id);

      // Set transport events
      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });

      transport.on("close", () => {
        console.log("Transport closed", transport.id);
      });

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (error) {
      console.error("Error creating WebRTC transport:", error);
      callback({ error: error.message });
    }
  });

  // Handle connect transport request
  socket.on(
    "connectTransport",
    async ({ transportId, dtlsParameters }, callback) => {
      try {
        if (!peerData.roomId) {
          throw new Error("Not in a room");
        }

        const transport = peerData.transports.get(transportId);
        if (!transport) {
          throw new Error(`Transport not found: ${transportId}`);
        }

        await transport.connect({ dtlsParameters });
        callback({ connected: true });
      } catch (error) {
        console.error("Error connecting transport:", error);
        callback({ error: error.message });
      }
    }
  );

  // Handle produce request (sending audio/video)
  socket.on(
    "produce",
    async ({ transportId, kind, rtpParameters, appData }, callback) => {
      try {
        if (!peerData.roomId) {
          throw new Error("Not in a room");
        }

        const room = rooms.get(peerData.roomId);
        const transport = peerData.transports.get(transportId);

        if (!transport) {
          throw new Error(`Transport not found: ${transportId}`);
        }

        // Create producer
        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData,
        });

        // Store producer
        room.producers.set(producer.id, producer);
        peerData.producers.set(producer.id, producer);

        // Add producer to peer data in room
        const peer = room.peers.get(socket.id);
        peer.producers.push(producer.id);

        // Producer events
        producer.on("transportclose", () => {
          producer.close();
        });

        // Notify all peers in the room about new producer
        socket.to(peerData.roomId).emit("newProducer", {
          producerId: producer.id,
          peerId: socket.id,
          kind,
        });

        callback({ id: producer.id });
      } catch (error) {
        console.error("Error producing:", error);
        callback({ error: error.message });
      }
    }
  );

  // Handle consume request (receiving audio/video)
  socket.on(
    "consume",
    async ({ transportId, producerId, rtpCapabilities }, callback) => {
      try {
        if (!peerData.roomId) {
          throw new Error("Not in a room");
        }

        const room = rooms.get(peerData.roomId);
        const transport = peerData.transports.get(transportId);

        if (!transport) {
          throw new Error(`Transport not found: ${transportId}`);
        }

        const producer = room.producers.get(producerId);
        if (!producer) {
          throw new Error(`Producer not found: ${producerId}`);
        }

        // Check if consumer can consume the producer
        if (
          !room.router.canConsume({
            producerId: producer.id,
            rtpCapabilities,
          })
        ) {
          throw new Error("Cannot consume this producer");
        }

        // Create consumer
        const consumer = await transport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true, // Start in paused state
        });

        // Store consumer
        room.consumers.set(consumer.id, consumer);
        peerData.consumers.set(consumer.id, consumer);

        // Add consumer to peer data in room
        const peer = room.peers.get(socket.id);
        peer.consumers.push(consumer.id);

        // Consumer events
        consumer.on("transportclose", () => {
          consumer.close();
        });

        consumer.on("producerclose", () => {
          socket.emit("producerClosed", { consumerId: consumer.id });
          consumer.close();
          room.consumers.delete(consumer.id);
          peerData.consumers.delete(consumer.id);
        });

        callback({
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          producerPeerId: Array.from(room.peers.values()).find((peer) =>
            peer.producers.includes(producerId)
          )?.id,
        });
      } catch (error) {
        console.error("Error consuming:", error);
        callback({ error: error.message });
      }
    }
  );

  // Handle resume consumer request
  socket.on("resumeConsumer", async ({ consumerId }, callback) => {
    try {
      const consumer = peerData.consumers.get(consumerId);
      if (!consumer) {
        throw new Error(`Consumer not found: ${consumerId}`);
      }

      await consumer.resume();
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
        // Clean up transports
        for (const transportId of peerData.transports.keys()) {
          const transport = peerData.transports.get(transportId);
          transport.close();
          room.transports.delete(transportId);
        }

        // Remove peer from room
        room.peers.delete(socket.id);

        // Notify other peers in the room
        socket.to(peerData.roomId).emit("peerLeft", {
          peerId: socket.id,
        });

        // If room is empty, close it
        if (room.peers.size === 0) {
          room.router.close();
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

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  await startMediasoup();
  console.log(`MediaSoup server running on port ${PORT}`);
});

module.exports = {
  app,
  io,
  startMediasoup,
};
