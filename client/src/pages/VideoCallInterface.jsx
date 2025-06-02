import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Users,
  PhoneOff,
  Settings,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  RepeatIcon as Record,
  Pin,
  PinOff,
  Volume1,
  Send,
  ScreenShare,
  ScreenShareOff,
  MonitorUp,
  Grid,
  Layout,
  UserPlus,
  MoreHorizontal,
  Disc2,
  CircleStop,
  Check,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoOffIcon as RecordOff } from "lucide-react";
import mediaSoupService from "/src/services/mediaSoupService.js";
import stompService from "/src/services/stompService.js";
import { Card } from "@/components/ui/card";
import API from "/src/api/api.js";
import { toast } from "sonner";
import axios from "axios";
import InviteDialog from "../components/InviteDialog";

export default function VideoCallInterface({
  meetingCode,
  getMeetingResponse,
}) {
  // State for UI controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [layout, setLayout] = useState("grid"); // grid, spotlight, sidebar
  const [isLeavingCall, setIsLeavingCall] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // State for user media
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(80);
  // const [videoStream, setVideoStream] = useState(null);
  // const [audioStream, setAudioStream] = useState(null);
  // State to store remote streams
  const [remoteStreams, setRemoteStreams] = useState({});
  // const remoteStreamRefs = useRef({});
  const [localStream, setLocalStream] = useState(null);
  const videoRefs = useRef({});

  // State for chat
  // const [chatMessages, setChatMessages] = useState([
  //   {
  //     id: 1,
  //     sender: "Alex Thompson",
  //     initials: "AT",
  //     message: "Hi everyone! Can you all see my screen?",
  //     timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  //     isCurrentUser: false,
  //   },
  //   {
  //     id: 2,
  //     sender: "Blake Rivera",
  //     initials: "BR",
  //     message: "Yes, I can see it clearly.",
  //     timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 minutes ago
  //     isCurrentUser: false,
  //   },
  //   {
  //     id: 3,
  //     sender: "You",
  //     initials: "YO",
  //     message: "I can see it too. Let's discuss the project timeline.",
  //     timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
  //     isCurrentUser: true,
  //   },
  // ]);
  const [newMessage, setNewMessage] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  // State for participants
  const [participants, setParticipants] = useState([
    {
      userId: localStorage.id,
      name: localStorage.name,
      initials: localStorage.name[0],
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      isCurrentUser: true,
      isPinned: false,
    },
  ]);

  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequestPopup, setShowJoinRequestPopup] = useState(true);
  const [currentPopupRequest, setCurrentPopupRequest] = useState(null);

  const MEDIASERVER_URL = import.meta.env.VITE_MEDIA_SERVER_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;

  // Set the current popup request when join requests change
  useEffect(() => {
    if (joinRequests.length > 0 && !currentPopupRequest) {
      setCurrentPopupRequest(joinRequests[0]);
      setShowJoinRequestPopup(true);
    } else if (joinRequests.length === 0) {
      setCurrentPopupRequest(null);
      setShowJoinRequestPopup(false);
    }
  }, [joinRequests]);

  // Refs
  const containerRef = useRef(null);
  const localVideoRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initializing socket.io connection

  // Track if we've completed MediaSoup initialization
  const [isMediaSoupInitialized, setIsMediaSoupInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await mediaSoupService.connect();
        await stompService.connect();

        stompService.subscribe(
          `/topic/meeting/${meetingCode}`,
          handleMeetingMessage
        );
        stompService.subscribe("/queue/meeting-updates", (data) => {
          console.log("Meeting update received:", data);
        });

        stompService.subscribe(`/topic/room/${meetingCode}`, async (data) => {
          console.log("Room update received:", data);
          if (data.type === "PARTICIPANT_JOINED") {
            // console.log("Participant joined:", data);
            toast.success(`${data.name} joined`);
            data.isCurrentUser = data.userId === localStorage.userId;
            // setParticipants((prev) => [...prev, data]);
            await joinRoom();
          }
        });

        if (getMeetingResponse.host) {
          // Host-specific subscription for join requests
          console.log("subscribing to join requests");
          stompService.subscribe("/user/queue/join-requests", (data) => {
            console.log("Join request received:", data);
            if (data.type === "JOIN_REQUEST") {
              setJoinRequests((prev) => [...prev, data]);
            }
          });
        }

        // Setup MediaSoup event handlers
        mediaSoupService.on(
          "newConsumer",
          ({ consumer, peerId, track, kind }) => {
            console.log(`New ${kind} consumer for peer ${peerId}`);

            // Update remoteStreams
            setRemoteStreams((prev) => {
              const newStreams = { ...prev };
              if (!newStreams[peerId]) {
                newStreams[peerId] = {};
              }
              newStreams[peerId][kind] = track;
              return newStreams;
            });
          }
        );

        mediaSoupService.on("peerLeft", (data) => {
          console.log(`Handling peer left: { peerId: ${JSON.stringify(data)}`);
          console.log("++++participants: ", participants);
          toast.info(`${data.name} left the meeting`);
          // Remove participant from the list
          removeParticipant(data.peerId);
        });

        mediaSoupService.on("peerJoined", (data) => {
          console.log(`Handling peer joined: ${data}`);
          toast(`${data.name} joined`);
          // Remove participant from the list
          if (data) {
            setParticipants((prev) => {
              const exists = prev.some((item) => item.userId === data.userId);
              if (!exists) {
                return [...prev, data]; // Add new if not exists
              }
              return prev;
            });
          }
        });

        console.log("before mediaSoupService.setupSocketListeners");
        // await mediaSoupService.setupSocketListeners();

        await joinRoom();
        // Signal that MediaSoup is ready
        setIsMediaSoupInitialized(true);
      } catch (error) {
        console.log(error);
      }
    })();

    return () => {
      // Disconnect from mediasoup and stomp
      mediaSoupService.close();
      stompService.disconnect();

      // Clean up STOMP subscriptions
      stompService.unsubscribe(`/topic/meeting/${meetingCode}`);
      stompService.unsubscribe(`/topic/meeting/${meetingCode}/chat`);
    };
  }, []);
  // console.log("Participants after useEffect: ", participants);

  const removeParticipant = (id) => {
    console.log("removeParticipant: ", participants);

    setParticipants((prevParticipants) =>
      prevParticipants.filter((participant) => participant.id !== id)
    );
  };

  useEffect(() => {
    (async () => await joinRoom())();
  }, [joinRequests]);

  const joinRoom = async () => {
    const { peerList } = await mediaSoupService.joinRoom(
      getMeetingResponse.mediaRoomId,
      localStorage.id,
      localStorage.name
    );
    console.log("list of participants: ", peerList);
    setParticipants((prev) => {
      return peerList.reduce(
        (acc, newParticipant) => {
          const existingIndex = acc.findIndex(
            (p) => p.userId === newParticipant.userId
          );
          if (existingIndex !== -1) {
            // Merge newParticipant with existing one
            const updatedParticipant = {
              ...acc[existingIndex],
              ...newParticipant,
            };
            acc[existingIndex] = updatedParticipant;
          } else {
            // Add new participant
            acc.push(newParticipant);
          }
          return acc;
        },
        [...prev]
      );
    });
  };

  console.log("Participants after use join room: ", participants);
  const initializeLocalMedia = async () => {
    try {
      // Request access to camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setLocalStream(stream);

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log("MediaSoup state:", {
        socket: mediaSoupService.socket?.connected,
        device: mediaSoupService.device?.loaded,
        producerTransport: !!mediaSoupService.producerTransport,
        consumerTransport: !!mediaSoupService.consumerTransport,
      });

      // Produce tracks for MediaSoup
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log("Producing audio track", audioTrack);

        await mediaSoupService.produceTrack(audioTrack, "audio");
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log("Producing video track");

        await mediaSoupService.produceTrack(videoTrack, "video");
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      // Set camera and mic to off if access is denied
      setIsCameraOff(true);
      setIsMicMuted(true);
    }
  };

  useEffect(() => {
    (async () => {
      if (isMediaSoupInitialized) await initializeLocalMedia();
    })();

    // Cleanup function to stop all tracks
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isMediaSoupInitialized]);

  const handleJoinRequest = async (id, isAccepted) => {
    try {
      if (isAccepted) {
        setAcceptLoading(true);
        await API.post(`/meeting/${meetingCode}/accept`, { participantId: id });
        setJoinRequests((prev) => prev.filter((p) => p.participantId !== id));
      } else {
        setRejectLoading(true);
        await API.post(`/meeting/${meetingCode}/reject`, { participantId: id });
      }
      setJoinRequests((prev) => prev.filter((p) => p.participantId !== id));

      // If this was the current popup request, show the next one or hide popup
      if (currentPopupRequest && currentPopupRequest.participantId === id) {
        const nextRequest = joinRequests.find(
          (req) => req.participantId !== id
        );
        setCurrentPopupRequest(nextRequest || null);
        if (!nextRequest) {
          setShowJoinRequestPopup(false);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setAcceptLoading(false);
      setRejectLoading(false);
    }
  };

  const handleMeetingMessage = (data) => {
    switch (data.type) {
      case "JOIN":
        // Handle new participant joined
        console.log("Participant joined:", data.user);
        setParticipants((prev) => [...prev, data.user]);
        break;

      case "LEAVE":
        // Handle participant left
        console.log("Participant left:", data.userId);
        setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
        break;

      case "STATUS_CHANGE":
        // Handle participant status change (mute, video off, etc.)
        console.log("Status change:", data);
        break;

      default:
        console.log("Unknown meeting message type:", data.type);
    }
  };

  // Handle sending a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newChatMessage = {
      id: chatMessages.length + 1,
      sender: localStorage.name,
      initials: localStorage.name[0],
      message: newMessage,
      timestamp: new Date(),
      isCurrentUser: true,
    };

    setChatMessages([...chatMessages, newChatMessage]);
    setNewMessage("");

    // Scroll to bottom of chat
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Handle toggling fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle leaving the call
  const handleLeaveCall = async () => {
    setIsLeavingCall(true);

    try {
      if (getMeetingResponse.host) {
        // If host, end the meeting
        await API.post(`/meeting/${meetingCode}/end`);
      } else {
        await API.post(`/meeting/${meetingCode}/leave`);
      }
    } catch (error) {
      console.error("Error leaving call:", error);
    } finally {
      // Cleanup MediaSoup and STOMP connections
      mediaSoupService.close();
      stompService.disconnect();

      // Reset state
      setParticipants([]);
      setRemoteStreams({});
      setLocalStream(null);
      setIsLeavingCall(false);

      // Redirect to home
      window.location.href = "/";
    }
  };

  // Handle toggling participant pin status
  const togglePinParticipant = (id) => {
    setParticipants(
      participants.map((participant) => {
        if (participant.participantId === id) {
          return { ...participant, isPinned: !participant.isPinned };
        } else if (participant.isPinned) {
          return { ...participant, isPinned: false };
        }
        return participant;
      })
    );
  };

  // Format timestamp for chat messages
  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp);
  };

  // Add this useEffect to listen for new consumers (remote tracks)
  useEffect(() => {
    const handleNewConsumer = ({ consumer, peerId, track, kind }) => {
      console.log(`New ${kind} consumer for peer ${peerId}`, track);

      // Update remoteStreams
      setRemoteStreams((prev) => {
        const newRemoteStreams = { ...prev };

        if (!newRemoteStreams[peerId]) {
          newRemoteStreams[peerId] = {};
        }

        newRemoteStreams[peerId][kind] = track;
        return newRemoteStreams;
      });

      // Update participant media state
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.userId === peerId) {
            if (kind === "audio") {
              return { ...p, isMuted: false };
            } else if (kind === "video") {
              return { ...p, isCameraOff: false };
            }
          }
          return p;
        })
      );
    };

    const handleConsumerClosed = ({ consumer, peerId, kind }) => {
      console.log(`Consumer closed: ${kind} from peer ${peerId}`);

      // Update remoteStreams
      setRemoteStreams((prev) => {
        const newRemoteStreams = { ...prev };

        if (newRemoteStreams[peerId]) {
          const peerStreams = { ...newRemoteStreams[peerId] };
          delete peerStreams[kind];

          if (Object.keys(peerStreams).length === 0) {
            delete newRemoteStreams[peerId];
          } else {
            newRemoteStreams[peerId] = peerStreams;
          }
        }

        return newRemoteStreams;
      });

      // Update participant media state
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.userId === peerId) {
            if (kind === "audio") {
              return { ...p, isMuted: true };
            } else if (kind === "video") {
              return { ...p, isCameraOff: true };
            }
          }
          return p;
        })
      );
    };

    // Add event listeners to mediaSoupService
    // mediaSoupService.on("newConsumer", handleNewConsumer);
    mediaSoupService.on("consumerClosed", handleConsumerClosed);

    // Cleanup
    return () => {
      mediaSoupService.off("newConsumer", handleNewConsumer);
      mediaSoupService.off("consumerClosed", handleConsumerClosed);
    };
  }, []);

  // Add this hook to handle ref assignment for video elements
  useEffect(() => {
    // This will create or update video elements when remoteStreams changes
    Object.entries(remoteStreams).forEach(([peerId, tracks]) => {
      if (tracks.video && videoRefs.current[peerId]) {
        const videoElement = videoRefs.current[peerId];

        // Check if the current video track is different
        if (
          !videoElement.srcObject ||
          !videoElement.srcObject.getVideoTracks()[0] ||
          videoElement.srcObject.getVideoTracks()[0].id !== tracks.video.id
        ) {
          // Create a new MediaStream with video and audio tracks
          const stream = new MediaStream();

          // Add video track
          stream.addTrack(tracks.video);

          // Add audio track if available
          if (tracks.audio) {
            stream.addTrack(tracks.audio);
          }

          videoElement.srcObject = stream;

          // Play the stream
          videoElement.play().catch((error) => {
            console.error("Error playing remote stream:", error);
          });
        }
      }
    });
  }, [remoteStreams]);

  // Function to toggle microphone
  const toggleMicrophone = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicMuted;
        setIsMicMuted(!isMicMuted);
      }
    }
  };

  // Function to toggle camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOff;
        setIsCameraOff(!isCameraOff);
      }
    }
  };

  // Function to toggle screen sharing
  const toggleScreenSharing = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      try {
        // Find any existing screen share producer and close it
        mediaSoupService.producers.forEach((producer, id) => {
          if (producer.appData && producer.appData.source === "screen") {
            mediaSoupService.closeProducer(id);
          }
        });

        setIsScreenSharing(false);
      } catch (error) {
        console.error("Error stopping screen sharing:", error);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor",
          },
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Handle user stopping sharing via browser UI
        screenTrack.addEventListener("ended", () => {
          setIsScreenSharing(false);

          // Find and close the screen producer
          mediaSoupService.producers.forEach((producer, id) => {
            if (producer.appData && producer.appData.source === "screen") {
              mediaSoupService.closeProducer(id);
            }
          });
        });

        // Create the producer with special appData
        await mediaSoupService.produceTrack(screenTrack, "video", {
          source: "screen",
        });

        setIsScreenSharing(true);
      } catch (error) {
        console.error("Error starting screen sharing:", error);
      }
    }
  };

  // Effect to scroll chat to bottom on initial load
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, []);
  console.log("---Video refs---: ", videoRefs.current);
  // Auto-hide controls after inactivity
  // useEffect(() => {
  //   let timeout;

  //   const handleMouseMove = () => {
  //     setShowControls(true);
  //     clearTimeout(timeout);

  //     timeout = setTimeout(() => {
  //       if (!isSettingsOpen) {
  //         setShowControls(false);
  //       }
  //     }, 3000);
  //   };

  //   window.addEventListener("mousemove", handleMouseMove);

  //   return () => {
  //     window.removeEventListener("mousemove", handleMouseMove);
  //     clearTimeout(timeout);
  //   };
  // }, [isSettingsOpen]);

  // Determine the main participant (pinned or screen sharing)
  const mainParticipant =
    participants.find((p) => p.isPinned) ||
    participants.find((p) => p.isScreenSharing) ||
    participants[0];

  // Filter other participants for the grid
  const otherParticipants = participants.filter(
    (p) => p.participantId !== mainParticipant.participantId
  );

  // recording
  const startRecording = async () => {
    try {
      // Get the current user's video stream
      const videoStream = localVideoRef.current?.srcObject;

      if (!videoStream) {
        toast.error("No video stream available for recording");
        return;
      }

      // Create a canvas to capture the entire meeting view
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions (you can adjust based on your needs)
      canvas.width = 1920;
      canvas.height = 1080;

      // Get audio context for mixing audio streams
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Collect all audio streams from participants
      const audioSources = [];

      // Add local audio if available
      if (videoStream.getAudioTracks().length > 0) {
        const localAudioSource =
          audioContext.createMediaStreamSource(videoStream);
        localAudioSource.connect(destination);
        audioSources.push(localAudioSource);
        console.log("Added local audio to recording");
      }

      // Add remote audio streams from remoteStreams
      Object.entries(remoteStreams).forEach(([peerId, tracks]) => {
        if (tracks && tracks.audio) {
          try {
            // Create a MediaStream from the audio track
            const remoteAudioStream = new MediaStream([tracks.audio]);
            const remoteAudioSource =
              audioContext.createMediaStreamSource(remoteAudioStream);
            remoteAudioSource.connect(destination);
            audioSources.push(remoteAudioSource);
            console.log(`Added remote audio from peer ${peerId} to recording`);
          } catch (error) {
            console.warn(`Failed to add audio from peer ${peerId}:`, error);
          }
        }
      });

      console.log(
        `Recording will include ${audioSources.length} audio sources`
      );

      // Create a combined stream with canvas video and mixed audio
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      // Function to draw the meeting layout on canvas
      const drawMeetingLayout = () => {
        // Clear canvas
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw main participant video (if in spotlight/pinned view)
        const mainParticipant =
          participants.find((p) => p.isPinned) || participants[0];

        if (participants.some((p) => p.isPinned)) {
          // Pinned layout - main video takes 70% width
          const mainWidth = canvas.width * 0.7;
          const mainHeight = canvas.height;

          if (mainParticipant && !mainParticipant.isCameraOff) {
            const videoElement = mainParticipant.isCurrentUser
              ? localVideoRef.current
              : videoRefs.current[mainParticipant.userId] ||
                document.getElementById(mainParticipant.userId);

            if (videoElement && videoElement.videoWidth > 0) {
              ctx.drawImage(videoElement, 0, 0, mainWidth, mainHeight);
            }
          } else {
            // Draw avatar placeholder for main participant
            drawAvatarPlaceholder(
              ctx,
              mainWidth / 2,
              mainHeight / 2,
              100,
              mainParticipant?.name || "Unknown"
            );
          }

          // Draw other participants in sidebar (30% width)
          const sidebarX = mainWidth;
          const sidebarWidth = canvas.width * 0.3;
          const participantHeight =
            canvas.height / Math.min(participants.length - 1, 4);

          participants
            .filter((p) => p.participantId !== mainParticipant?.participantId)
            .slice(0, 4)
            .forEach((participant, index) => {
              const y = index * participantHeight;

              if (!participant.isCameraOff) {
                const videoElement = participant.isCurrentUser
                  ? localVideoRef.current
                  : videoRefs.current[participant.userId] ||
                    document.getElementById(participant.userId);

                if (videoElement && videoElement.videoWidth > 0) {
                  ctx.drawImage(
                    videoElement,
                    sidebarX,
                    y,
                    sidebarWidth,
                    participantHeight
                  );
                }
              } else {
                // Draw avatar placeholder
                drawAvatarPlaceholder(
                  ctx,
                  sidebarX + sidebarWidth / 2,
                  y + participantHeight / 2,
                  50,
                  participant.name
                );
              }
            });
        } else {
          // Grid layout
          const cols = Math.ceil(Math.sqrt(participants.length));
          const rows = Math.ceil(participants.length / cols);
          const cellWidth = canvas.width / cols;
          const cellHeight = canvas.height / rows;

          participants.forEach((participant, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * cellWidth;
            const y = row * cellHeight;

            if (!participant.isCameraOff) {
              const videoElement = participant.isCurrentUser
                ? localVideoRef.current
                : videoRefs.current[participant.userId] ||
                  document.getElementById(participant.userId);

              if (videoElement && videoElement.videoWidth > 0) {
                ctx.drawImage(videoElement, x, y, cellWidth, cellHeight);
              }
            } else {
              // Draw avatar placeholder
              drawAvatarPlaceholder(
                ctx,
                x + cellWidth / 2,
                y + cellHeight / 2,
                Math.min(cellWidth, cellHeight) / 4,
                participant.name
              );
            }

            // Draw participant name overlay
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(x + 10, y + cellHeight - 40, cellWidth - 20, 30);
            ctx.fillStyle = "#ffffff";
            ctx.font = "16px Arial";
            ctx.fillText(
              participant.name || "Unknown",
              x + 15,
              y + cellHeight - 20
            );
          });
        }

        // Draw recording indicator
        ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
        ctx.beginPath();
        ctx.arc(50, 50, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Arial";
        ctx.fillText("REC", 80, 55);
      };

      // Helper function to draw avatar placeholder
      const drawAvatarPlaceholder = (ctx, x, y, radius, name) => {
        // Draw circle background
        ctx.fillStyle = "#6b7280";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw initials
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${radius / 2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const initials = name
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : "?";
        ctx.fillText(initials, x, y);

        // Reset text alignment
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      };

      // Set up MediaRecorder with the combined stream
      const options = {
        mimeType: "video/webm;codecs=vp9,opus", // VP9 for video, Opus for audio
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000, // 128 kbps for audio
      };

      // Fallback mime types if VP9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          options.mimeType = "video/webm;codecs=vp8,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          options.mimeType = "video/webm";
        } else {
          options.mimeType = "video/mp4";
        }
      }

      console.log("Using MIME type:", options.mimeType);
      console.log("Combined stream tracks:", {
        video: combinedStream.getVideoTracks().length,
        audio: combinedStream.getAudioTracks().length,
      });

      // Initialize chunks array and recorder
      const chunks = [];
      const recorder = new MediaRecorder(combinedStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log("Recording chunk received:", event.data.size, "bytes");
        }
      };

      recorder.onstop = async () => {
        console.log("Recording stopped, processing...");
        console.log("Total chunks collected:", chunks.length);
        console.log(
          "Chunk sizes:",
          chunks.map((chunk) => chunk.size)
        );

        // Create blob first
        let blob = null;
        if (chunks.length > 0) {
          blob = new Blob(chunks, { type: options.mimeType });
          console.log("Recording blob created:", {
            size: blob.size,
            type: blob.type,
            chunks: chunks.length,
          });
        }

        // Clean up drawing interval (already done in stopRecording, but double check)
        if (recorder.drawingInterval) {
          clearInterval(recorder.drawingInterval);
          recorder.drawingInterval = null;
        }

        // Process and upload the recording
        if (blob && blob.size > 0) {
          try {
            // Show processing status
            toast.promise(uploadRecording(blob), {
              loading: "Processing recording...",
              success: "Recording processed successfully",
              error: "Failed to process recording",
            });
            // await uploadRecording(blob);
          } catch (uploadError) {
            console.error("Error during upload/compression:", uploadError);
            toast.error("Failed to process recording");
          }
        } else {
          console.error("Recording blob is empty or missing");
          toast.error("Recording failed - no data captured");
        }

        // Clean up audio context and sources AFTER upload is complete
        try {
          // Disconnect all audio sources
          if (recorder.audioSources) {
            recorder.audioSources.forEach((source) => {
              try {
                source.disconnect();
              } catch (e) {
                console.warn("Error disconnecting audio source:", e);
              }
            });
          }

          if (
            recorder.audioContext &&
            recorder.audioContext.state !== "closed"
          ) {
            await recorder.audioContext.close();
          }
        } catch (error) {
          console.warn("Error closing audio context:", error);
        }

        // Clear the MediaRecorder reference
        setMediaRecorder(null);

        console.log("Recording cleanup completed");
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        toast.error("Recording error occurred: " + event.error.message);
      };

      // Wait a bit for the canvas to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start drawing loop to capture the meeting layout first
      const drawingInterval = setInterval(drawMeetingLayout, 33); // ~30 FPS

      // Wait for the first frame to be drawn
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start recording
      recorder.start(1000); // Collect data every second

      // Store references for cleanup
      recorder.drawingInterval = drawingInterval;
      recorder.audioSources = audioSources;
      recorder.audioContext = audioContext;

      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks([]); // Reset the state but use local chunks array
      toast.success("Recording started with audio from all participants");

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording: " + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      console.log("Stopping recording...");

      // Clear drawing interval immediately
      if (mediaRecorder.drawingInterval) {
        clearInterval(mediaRecorder.drawingInterval);
        mediaRecorder.drawingInterval = null;
      }

      // Stop the recorder
      mediaRecorder.stop();
      setIsRecording(false);

      // Clear the reference
      // setMediaRecorder(null);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      // Check blob size before upload
      if (blob.size === 0) {
        toast.error("Cannot upload empty recording");
        return;
      }

      console.log("Uploading recording blob:", {
        size: blob.size,
        type: blob.type,
      });

      const signatureResponse = await axios.get(
        `${MEDIASERVER_URL}/api/cloudinary-signature`,
        {
          withCredentials: true,
        }
      );
      const { signature, timestamp, cloudName, apiKey } =
        signatureResponse.data;

      const formData = new FormData();

      // Determine file extension based on blob type
      const fileExtension = blob.type.includes("webm") ? "webm" : "mp4";
      const fileName = `meeting-${meetingCode}-${Date.now()}.${fileExtension}`;

      formData.append("file", blob, fileName);
      formData.append("meetingCode", meetingCode);
      formData.append("participantId", localStorage.id);
      formData.append("recordingType", "video");
      formData.append("duration", Math.floor(blob.size / (1024 * 1024))); // Approximate duration
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      // Upload the file to Cloudinary
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        formData
      );

      console.log("Recording uploaded successfully:", response.data);

      const res = await API.post("/meeting/upload-recording", {
        url: response.data.secure_url,
        meetingCode: meetingCode,
        participantId: localStorage.id,
        recordingType: "video",
        duration: response.data.duration,
      });

      toast.promise(
        generateTranscription(response.data.secure_url, meetingCode),
        {
          loading: "Generating transcription...",
          success: "Transcription completed successfully",
          error: "Transcription failed, but recording was saved",
        }
      );

      return res.data;
    } catch (error) {
      console.error("Error uploading recording:", error);
      if (error.code === "ECONNABORTED") {
        toast.error("Upload timeout - file may be too large");
      } else if (error.response?.status === 413) {
        toast.error("File too large - please try a shorter recording");
      } else {
        toast.error("Failed to upload recording");
      }
    }
  };
  //   try {
  //     console.log("Starting FFmpeg compression...");

  //     // Set a timeout for the entire compression process
  //     const compressionTimeout = 60000; // 60 seconds

  //     const compressionPromise = (async () => {
  //       // Import FFmpeg.wasm

  //       const ffmpeg = new FFmpeg();
  //       console.log("FFmpeg instance created");

  //       // Add progress tracking
  //       ffmpeg.on("log", ({ message }) => {
  //         console.log("FFmpeg log:", message);
  //       });

  //       ffmpeg.on("progress", ({ progress, time }) => {
  //         const percent = Math.round(progress * 100);
  //         console.log(`FFmpeg progress: ${percent}% (${time}ms)`);

  //         // Update UI with progress if needed
  //         if (percent % 10 === 0) {
  //           // Log every 10%
  //           toast.info(`Compressing: ${percent}%`);
  //         }
  //       });

  //       // Load FFmpeg with timeout
  //       console.log("Loading FFmpeg core...");
  //       const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

  //       await ffmpeg.load({
  //         coreURL: await toBlobURL(
  //           `${baseURL}/ffmpeg-core.js`,
  //           "text/javascript"
  //         ),
  //         wasmURL: await toBlobURL(
  //           `${baseURL}/ffmpeg-core.wasm`,
  //           "application/wasm"
  //         ),
  //       });

  //       console.log("FFmpeg loaded successfully");

  //       // Write input file
  //       console.log("Writing input file to FFmpeg...");
  //       await ffmpeg.writeFile("input.webm", await fetchFile(blob));
  //       console.log("Input file written successfully");

  //       // Compress video with more aggressive settings for faster processing
  //       console.log("Starting FFmpeg compression...");
  //       await ffmpeg.exec([
  //         "-i",
  //         "input.webm",
  //         "-c:v",
  //         "libvpx-vp9",
  //         "-crf",
  //         "35", // Increased CRF for faster encoding (less quality but smaller file)
  //         "-b:v",
  //         "800k", // Reduced bitrate
  //         "-c:a",
  //         "libopus",
  //         "-b:a",
  //         "64k",
  //         "-vf",
  //         "scale=1280:720", // Scale to 720p
  //         "-r",
  //         "20", // Reduced frame rate
  //         "-preset",
  //         "fast", // Faster encoding preset
  //         "-threads",
  //         "4", // Use multiple threads
  //         "output.webm",
  //       ]);

  //       console.log("FFmpeg compression completed");

  //       // Read compressed file
  //       console.log("Reading compressed file...");
  //       const data = await ffmpeg.readFile("output.webm");
  //       const compressedBlob = new Blob([data.buffer], { type: "video/webm" });

  //       console.log("Compressed blob created:", {
  //         originalSize: blob.size,
  //         compressedSize: compressedBlob.size,
  //         compressionRatio:
  //           (((blob.size - compressedBlob.size) / blob.size) * 100).toFixed(1) +
  //           "%",
  //       });

  //       return compressedBlob;
  //     })();

  //     // Race between compression and timeout
  //     const result = await Promise.race([
  //       compressionPromise,
  //       new Promise((_, reject) =>
  //         setTimeout(
  //           () => reject(new Error("Compression timeout")),
  //           compressionTimeout
  //         )
  //       ),
  //     ]);

  //     return result;
  //   } catch (error) {
  //     console.error("FFmpeg compression failed:", error);

  //     if (error.message === "Compression timeout") {
  //       console.log("Compression timed out, using original file");
  //       toast.warn("Compression timed out, uploading original file");
  //     } else {
  //       console.log("Compression failed, using original file");
  //       toast.warn("Compression failed, uploading original file");
  //     }

  //     // Return original blob if compression fails or times out
  //     throw error;
  //   }
  // };

  const generateTranscription = async (cloudinaryVideoUrl, meetingId) => {
    try {
      const response = await axios.post(
        "http://localhost:3000/api/transcribe-from-url",
        {
          videoUrl: cloudinaryVideoUrl,
          meetingId,
          language: "en-US",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Transcription response:", response.data);
      // Save transcription to database
      try {
        const saveResponse = await API.post("/meeting/save-transcription", {
          meetingCode: meetingId,
          transcription: response.data.transcription,
        });

        console.log("Transcription saved to database:", saveResponse.data);

        // Optionally generate summary
        // const summaryResponse = await axios.post('http://localhost:3000/api/generate-summary', {
        //   transcription: response.data.transcription,
        //   meetingId
        // });

        // console.log('Meeting Summary:', summaryResponse.data);
      } catch (dbError) {
        console.error("Failed to save transcription to database:", dbError);
        throw new Error(
          "Transcription completed but failed to save to database"
        );
      }
    } catch (error) {
      console.error("Error generating transcription:", error);
      throw error;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-screen dark:bg-black overflow-hidden"
    >
      {/* Main Video Area */}
      <div className="flex-1 flex relative min-h-0">
        {/* Video Grid with Pinned Layout Support */}
        {participants.some((p) => p.isPinned) ? (
          // Pinned layout - 70/30 split
          <div className="flex w-full h-full overflow-hidden">
            {/* Pinned participant - 70% width */}
            <div className="w-[70%] h-full p-1">
              {mainParticipant && (
                <div className="relative w-full h-full bg-muted rounded-md overflow-hidden">
                  {mainParticipant.isCameraOff ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Avatar className="h-24 w-24 mb-2">
                        <AvatarFallback className="text-2xl">
                          {mainParticipant.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white">{mainParticipant.name}</span>
                      {mainParticipant.isPinned && (
                        <Badge className="mt-2 bg-primary/60">Pinned</Badge>
                      )}
                    </div>
                  ) : mainParticipant.isScreenSharing ? (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <ScreenShare className="h-12 w-12 mx-auto mb-2 text-white/70" />
                        <p className="text-white">
                          {mainParticipant.name} is sharing their screen
                        </p>
                        {mainParticipant.isPinned && (
                          <Badge className="mt-2 bg-primary/60">Pinned</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        className="w-full h-full object-cover transform scale-x-[-1]"
                        autoPlay
                        muted={mainParticipant.isCurrentUser}
                        ref={
                          mainParticipant.isCurrentUser
                            ? localVideoRef
                            : (el) => {
                                if (el)
                                  videoRefs.current[mainParticipant.userId] =
                                    el;
                              }
                        }
                      />
                      <div className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded flex items-center gap-2">
                        {mainParticipant.name}
                        {mainParticipant.isPinned && (
                          <Badge className="bg-primary/60">Pinned</Badge>
                        )}
                        {mainParticipant.isMuted && (
                          <MicOff className="h-4 w-4" />
                        )}
                      </div>
                    </>
                  )}
                  {/* Pin/Unpin button */}
                  <button
                    className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-md hover:bg-black/70 transition-colors"
                    onClick={() => togglePinParticipant(mainParticipant)}
                  >
                    {mainParticipant.isPinned ? (
                      <PinOff className="h-5 w-5 text-white" />
                    ) : (
                      <Pin className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Other participants - 30% width, vertical stack */}
            <div className="w-[30%] h-full p-1 flex flex-col">
              {/* Display up to 4 other participants */}
              <div className="flex-1 grid grid-cols-1 gap-1 overflow-hidden">
                {otherParticipants.slice(0, 4).map((participant) => (
                  <div
                    key={participant.participantId}
                    className="relative bg-muted rounded-md overflow-hidden"
                  >
                    {participant.isCameraOff ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Avatar className="h-12 w-12 mb-1">
                          <AvatarFallback className="text-lg">
                            {participant.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm">
                          {participant.name}
                        </span>
                      </div>
                    ) : participant.isScreenSharing ? (
                      <div className="h-full flex items-center justify-center bg-gray-800">
                        <div className="text-center">
                          <ScreenShare className="h-8 w-8 mx-auto mb-1 text-white/70" />
                          <p className="text-white text-sm">Screen sharing</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {console.log("participant: ", participant)}
                        <video
                          className="w-full h-full object-cover transform scale-x-[-1]"
                          autoPlay
                          muted={participant.isCurrentUser}
                          ref={
                            participant.isCurrentUser
                              ? localVideoRef
                              : (el) => {
                                  if (el)
                                    videoRefs.current[participant.userId] = el;
                                }
                          }
                        />
                        <div className="absolute bottom-1 left-1 text-white bg-black/50 px-1 py-0.5 rounded text-sm flex items-center gap-1">
                          {participant.name}
                          {participant.isMuted && (
                            <MicOff className="h-3 w-3" />
                          )}
                        </div>
                      </>
                    )}

                    {/* Pin/Unpin button for each participant */}
                    <button
                      onClick={() =>
                        togglePinParticipant(participant.participantId)
                      }
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white/80 hover:text-white hover:bg-black/70"
                      title={`${
                        participant.isPinned ? "Unpin" : "Pin"
                      } participant`}
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Show indicator if there are more than 4 other participants */}
                {otherParticipants.length > 4 && (
                  <div className="flex items-center justify-center bg-black/30 rounded-md text-white p-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span>+{otherParticipants.length - 4} more</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`flex-1 min-h-0 ${
              layout === "spotlight"
                ? "grid grid-cols-1"
                : participants.length <= 2
                ? "grid grid-cols-1 md:grid-cols-2"
                : participants.length <= 4
                ? "grid grid-cols-1 md:grid-cols-2"
                : participants.length <= 6
                ? "grid grid-cols-2 md:grid-cols-3"
                : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            } gap-1 p-1 relative`}
          >
            {layout === "spotlight" ? (
              // Spotlight layout with one main video
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  {mainParticipant.isCameraOff ? (
                    <div className="flex flex-col items-center justify-center">
                      <Avatar className="h-24 w-24 mb-2">
                        <AvatarFallback className="text-2xl">
                          {mainParticipant.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white">{mainParticipant.name}</span>
                    </div>
                  ) : mainParticipant.isScreenSharing ? (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <ScreenShare className="h-12 w-12 mx-auto mb-2 text-white/70" />
                        <p className="text-white">
                          {mainParticipant.name} is sharing their screen
                        </p>
                      </div>
                    </div>
                  ) : (
                    <video
                      className="w-full h-full object-cover transform scale-x-[-1]"
                      autoPlay
                      muted={mainParticipant.isCurrentUser}
                      ref={
                        mainParticipant.isCurrentUser
                          ? localVideoRef
                          : (el) => {
                              if (el)
                                videoRefs.current[mainParticipant.userId] = el;
                            }
                      }
                    />
                  )}

                  {/* Participant info overlay */}
                  <div className="absolute bottom-2 left-2 flex items-center space-x-2 bg-black/50 rounded-md px-2 py-1">
                    <span className="text-white text-sm">
                      {mainParticipant.name}
                    </span>
                    {mainParticipant.isMuted && (
                      <MicOff className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  {/* Pin/Unpin button */}
                  <button
                    className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-md hover:bg-black/70 transition-colors"
                    onClick={() =>
                      togglePinParticipant(mainParticipant.participantId)
                    }
                  >
                    {mainParticipant.isPinned ? (
                      <PinOff className="h-5 w-5 text-white" />
                    ) : (
                      <Pin className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>

                {/* Thumbnail strip for other participants */}
                <div className="absolute bottom-4 right-4 flex space-x-2 max-w-[80%] overflow-x-auto py-2 px-1">
                  {otherParticipants.map((participant) => (
                    <div
                      key={participant.participantId}
                      className="relative w-32 h-24 flex-shrink-0 bg-muted rounded-md overflow-hidden border-2 border-transparent hover:border-primary cursor-pointer transition-all"
                      onClick={() =>
                        togglePinParticipant(participant.participantId)
                      }
                    >
                      {participant.isCameraOff ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="text-xl">
                              {participant.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white mt-2 text-center px-2 max-w-full truncate">
                            {participant.name}
                          </span>
                        </div>
                      ) : participant.isScreenSharing ? (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                          <ScreenShare className="h-6 w-6 text-white/70" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-white text-xs">Video</span>
                        </div>
                      )}

                      {/* Participant info overlay */}
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between bg-black/50 rounded-sm px-1 py-0.5">
                        <span className="text-white text-xs truncate">
                          {participant.name}
                        </span>
                        {participant.isMuted && (
                          <MicOff className="h-3 w-3 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Grid layout with all participants
              participants.map((participant) => (
                <div
                  key={participant.participantId}
                  className={`relative ${
                    participant.isPinned ? "col-span-full row-span-2" : ""
                  } bg-muted rounded-md overflow-hidden`}
                >
                  {participant.isCameraOff ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-xl">
                          {participant.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white mt-2 text-center px-2 max-w-full truncate">
                        {participant.name}
                      </span>
                    </div>
                  ) : participant.isScreenSharing ? (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <ScreenShare className="h-8 w-8 mx-auto mb-2 text-white/70" />
                        <p className="text-white text-sm">
                          {participant.name} is sharing their screen
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {console.log("participant: ", participant)}
                      {console.log("remote streams: ", remoteStreams)}
                      <video
                        className=" h-full object-cover transform scale-x-[-1]"
                        playsInline
                        autoPlay
                        id={participant.userId}
                        muted={participant.isCurrentUser}
                        ref={(el) => {
                          if (!el) return;

                          if (participant.isCurrentUser) {
                            localVideoRef.current = el;

                            // Set srcObject for local video
                            if (localStream && el.srcObject !== localStream) {
                              console.log(
                                "Setting local stream to video element"
                              );
                              el.srcObject = localStream;
                              el.play().catch((e) =>
                                console.warn("Local video play failed:", e)
                              );
                            }
                          } else {
                            // Set ref for remote participant
                            videoRefs.current[participant.userId] = el;

                            // Check if we have a remote stream for this participant
                            if (
                              remoteStreams[participant.peerId] ||
                              remoteStreams[participant.id]
                            ) {
                              console.log(
                                "Found remote stream for",
                                participant.name
                              );

                              // Create a new MediaStream with video and audio tracks
                              const stream = new MediaStream();

                              // Add video track if available
                              if (
                                remoteStreams[participant.peerId]?.video ||
                                remoteStreams[participant.id]?.video
                              ) {
                                stream.addTrack(
                                  remoteStreams[participant.peerId]?.video ||
                                    remoteStreams[participant.id]?.video
                                );
                                console.log("Added video track");
                              }

                              // Add audio track if available
                              if (
                                remoteStreams[participant.peerId]?.audio ||
                                remoteStreams[participant.id]?.audio
                              ) {
                                stream.addTrack(
                                  remoteStreams[participant.peerId]?.audio ||
                                    remoteStreams[participant.id]?.audio
                                );
                                console.log("Added audio track");
                              }

                              console.log(
                                "Check mediastream: ",
                                stream.getVideoTracks()
                              );
                              // Set srcObject only if it's different
                              if (el.srcObject !== stream) {
                                console.log(
                                  "Setting remote stream for",
                                  participant.name
                                );
                                el.srcObject = stream;

                                el.playsInline = true;
                                el.controls = false; // optional, but often helps with debugging

                                // Force play with a delay
                                // setTimeout(() => {
                                //   el.play().catch(error => {
                                //     console.error("Error auto-playing video:", error);
                                //
                                //     // Create a play button if autoplay fails
                                //     const playButton = document.createElement('button');
                                //     playButton.textContent = 'Click to play video';
                                //     playButton.style.position = 'absolute';
                                //     playButton.style.zIndex = '10';
                                //     playButton.style.top = '50%';
                                //     playButton.style.left = '50%';
                                //     playButton.style.transform = 'translate(-50%, -50%)';
                                //     playButton.style.padding = '10px';
                                //
                                //     playButton.onclick = () => {
                                //       el.play();
                                //       playButton.remove();
                                //     };
                                //
                                //     el.parentNode.appendChild(playButton);
                                //   });
                                // }, 500);
                              }
                            } else {
                              console.log(
                                "No remote stream found for",
                                participant.name
                              );
                            }
                          }
                        }}
                      />
                    </>
                  )}

                  {/* Participant info overlay */}
                  <div className="absolute bottom-2 left-2 flex items-center space-x-2 bg-black/50 rounded-md px-2 py-1">
                    <span className="text-white text-sm">
                      {participant.name}
                    </span>
                    {participant.isMuted && (
                      <MicOff className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  {/* Pin/Unpin button */}
                  <button
                    className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-md hover:bg-black/70 transition-colors"
                    onClick={() =>
                      togglePinParticipant(participant.participantId)
                    }
                  >
                    {participant.isPinned ? (
                      <PinOff className="h-5 w-5 text-white" />
                    ) : (
                      <Pin className="h-5 w-5 text-white" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        {/* Sidebar */}
        <div
          className={`h-full bg-background border-l transition-all duration-300 ${
            isSidebarOpen
              ? "w-full sm:w-80"
              : "w-0 opacity-0 pointer-events-none"
          } absolute sm:relative right-0 z-10`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center h-full p-3 border-b">
              <Tabs
                value={sidebarTab}
                onValueChange={setSidebarTab}
                className="w-full h-full overflow-y-auto"
              >
                <TabsList className="w-full">
                  {/* <TabsTrigger value="chat" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger> */}
                  <TabsTrigger value="participants" className="flex-1">
                    <Users className="h-4 w-4 mr-2" />
                    Participants ({participants.length})
                  </TabsTrigger>
                </TabsList>

                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 flex-shrink-0"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* <TabsContent
                  value="chat"
                  className="flex-1 flex flex-col p-0 m-0"
                >
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-3 space-y-4"
                  >
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isCurrentUser
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] ${
                            message.isCurrentUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          } rounded-lg p-3`}
                        >
                          {!message.isCurrentUser && (
                            <div className="flex items-center space-x-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {message.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {message.sender}
                              </span>
                            </div>
                          )}
                          <p className="text-sm">{message.message}</p>
                          <div
                            className={`text-xs mt-1 ${
                              message.isCurrentUser
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            } text-right`}
                          >
                            {formatTimestamp(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t sticky bottom-0 bg-black"
                  >
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </TabsContent> */}

                <TabsContent
                  value="participants"
                  className="flex-1 p-0 m-0 overflow-y-auto"
                >
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">In this call</h3>
                      <InviteDialog
                        meetingCode={meetingCode}
                        meetingUrl={`${APP_URL}/${meetingCode}`}
                      />
                    </div>

                    {/* Join Requests Section */}
                    {joinRequests.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-destructive flex items-center">
                            <Bell className="h-4 w-4 mr-1" />
                            Join Requests ({joinRequests.length})
                          </h4>
                        </div>
                        <div className="space-y-2 bg-muted/30 p-2 rounded-md">
                          {joinRequests.map((request) => (
                            <div
                              key={request.participantId}
                              className="flex items-center justify-between p-2 rounded-md bg-background"
                            >
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {request.userName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-medium text-sm">
                                    {request.userName}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {formatTimestamp(request.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    handleJoinRequest(
                                      request.participantId,
                                      false
                                    )
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-500 hover:text-green-500 hover:bg-green-500/10"
                                  onClick={() =>
                                    handleJoinRequest(
                                      request.participantId,
                                      true
                                    )
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {participants.map((participant) => (
                        <div
                          key={participant.participantId}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {participant.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center">
                                <span className="font-medium text-sm">
                                  {participant.name}
                                  {participant.isCurrentUser && " (You)"}
                                </span>
                                {participant.isPinned && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 h-5 px-1 text-xs"
                                  >
                                    <Pin className="h-3 w-3 mr-1" />
                                    Pinned
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-0.5">
                                {participant.isMuted ? (
                                  <MicOff className="h-3 w-3 text-red-500" />
                                ) : (
                                  <Mic className="h-3 w-3 text-green-500" />
                                )}

                                {participant.isCameraOff ? (
                                  <VideoOff className="h-3 w-3 text-red-500" />
                                ) : (
                                  <Video className="h-3 w-3 text-green-500" />
                                )}

                                {participant.isScreenSharing && (
                                  <ScreenShare className="h-3 w-3 text-blue-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  togglePinParticipant(
                                    participant.participantId
                                  )
                                }
                              >
                                {participant.isPinned ? (
                                  <>
                                    <PinOff className="h-4 w-4 mr-2" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4 mr-2" />
                                    Pin
                                  </>
                                )}
                              </DropdownMenuItem>
                              {!participant.isCurrentUser && (
                                <>
                                  <DropdownMenuItem>
                                    <Volume1 className="h-4 w-4 mr-2" />
                                    Adjust volume
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Private message
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-500">
                                    <X className="h-4 w-4 mr-2" />
                                    Remove from call
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        className={`transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        } z-20`}
      >
        <div className="flex justify-center pb-4">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-2 py-2 shadow-lg flex items-center space-x-1 gap-3">
            {/* Audio Controls */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMicMuted ? "destructive" : "ghost"}
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={() => {
                      // setIsMicMuted(!isMicMuted);
                      toggleMicrophone();
                    }}
                  >
                    {isMicMuted ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isMicMuted ? "Unmute microphone" : "Mute microphone"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Video Controls */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCameraOff ? "destructive" : "ghost"}
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={() => {
                      // setIsCameraOff(!isCameraOff);
                      toggleCamera();
                    }}
                  >
                    {isCameraOff ? (
                      <VideoOff className="h-5 w-5" />
                    ) : (
                      <Video className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCameraOff ? "Turn on camera" : "Turn off camera"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Screen Share */}
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isScreenSharing ? "default" : "ghost"}
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                  >
                    {isScreenSharing ? (
                      <ScreenShareOff className="h-5 w-5" />
                    ) : (
                      <ScreenShare className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isScreenSharing ? "Stop sharing screen" : "Share screen"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

            {/* Layout Toggle */}
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-12 w-12"
                      >
                        {layout === "grid" ? (
                          <Grid className="h-5 w-5" />
                        ) : (
                          <Layout className="h-5 w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Layout</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setLayout("grid")}>
                        <Grid className="h-4 w-4 mr-2" />
                        Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLayout("spotlight")}>
                        <Layout className="h-4 w-4 mr-2" />
                        Spotlight View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>Change layout</TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

            {/* Recording */}
            {getMeetingResponse.host && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isRecording ? "default" : "ghost"}
                      size="icon"
                      className={`rounded-full h-12 w-12 ${
                        isRecording ? "animate-pulse" : ""
                      }`}
                      onClick={() =>
                        isRecording ? stopRecording() : startRecording()
                      }
                    >
                      {isRecording ? (
                        <CircleStop className="h-5 w-5 text-red-500" />
                      ) : (
                        <Disc2 className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isRecording ? "Stop recording" : "Start recording"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="h-8 border-l mx-1"></div>

            {/* Chat Toggle */}
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      isSidebarOpen && sidebarTab === "chat"
                        ? "default"
                        : "ghost"
                    }
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={() => {
                      setSidebarTab("chat");
                      setIsSidebarOpen(
                        !(isSidebarOpen && sidebarTab === "chat")
                      );
                    }}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSidebarOpen && sidebarTab === "chat"
                    ? "Close chat"
                    : "Open chat"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

            {/* Participants Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      isSidebarOpen && sidebarTab === "participants"
                        ? "default"
                        : "ghost"
                    }
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={() => {
                      setSidebarTab("participants");
                      setIsSidebarOpen(
                        !(isSidebarOpen && sidebarTab === "participants")
                      );
                    }}
                  >
                    <Users className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSidebarOpen && sidebarTab === "participants"
                    ? "Close participants"
                    : "Show participants"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Settings */}
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-12 w-12"
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                        <DialogDescription>
                          Adjust your audio and video settings
                        </DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="audio" className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="audio">Audio</TabsTrigger>
                          <TabsTrigger value="video">Video</TabsTrigger>
                        </TabsList>
                        <TabsContent value="audio" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="microphone">Microphone</Label>
                            <Select defaultValue="default">
                              <SelectTrigger id="microphone">
                                <SelectValue placeholder="Select microphone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">
                                  Default Microphone
                                </SelectItem>
                                <SelectItem value="headset">
                                  Headset Microphone
                                </SelectItem>
                                <SelectItem value="external">
                                  External Microphone
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="speaker">Speaker</Label>
                            <Select defaultValue="default">
                              <SelectTrigger id="speaker">
                                <SelectValue placeholder="Select speaker" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">
                                  Default Speaker
                                </SelectItem>
                                <SelectItem value="headset">
                                  Headset Speaker
                                </SelectItem>
                                <SelectItem value="external">
                                  External Speaker
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="volume">Volume</Label>
                              <span className="text-sm text-muted-foreground">
                                {audioLevel}%
                              </span>
                            </div>
                            <Slider
                              id="volume"
                              min={0}
                              max={100}
                              step={1}
                              value={[audioLevel]}
                              onValueChange={(value) => setAudioLevel(value[0])}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="noise-suppression">
                              Noise suppression
                            </Label>
                            <Switch id="noise-suppression" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="echo-cancellation">
                              Echo cancellation
                            </Label>
                            <Switch id="echo-cancellation" defaultChecked />
                          </div>
                        </TabsContent>

                        <TabsContent value="video" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="camera">Camera</Label>
                            <Select defaultValue="default">
                              <SelectTrigger id="camera">
                                <SelectValue placeholder="Select camera" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">
                                  Default Camera
                                </SelectItem>
                                <SelectItem value="external">
                                  External Camera
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                            {isCameraOff ? (
                              <div className="text-center">
                                <VideoOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  Camera is off
                                </p>
                              </div>
                            ) : (
                              <video
                                className="w-full h-full object-cover rounded-md transform scale-x-[-1]"
                                autoPlay
                                muted
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="hd-video">HD video</Label>
                            <Switch id="hd-video" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="mirror-video">
                              Mirror my video
                            </Label>
                            <Switch id="mirror-video" />
                          </div>
                        </TabsContent>
                      </Tabs>
                      <DialogFooter>
                        <Button
                          type="submit"
                          onClick={() => setIsSettingsOpen(false)}
                        >
                          Save changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

            <div className="h-8 border-l mx-1"></div>

            {/* Fullscreen Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Leave Call */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-12 w-12 ml-1"
                    onClick={handleLeaveCall}
                    disabled={isLeavingCall}
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {getMeetingResponse.host
                    ? "End call for everyone"
                    : "Leave call"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Join Request Popup */}
      {showJoinRequestPopup && currentPopupRequest && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-10 duration-300">
          <Card className="w-80 shadow-lg border-l-4 border-l-primary">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {currentPopupRequest.userName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-sm">Join Request</h4>
                    <p className="text-sm">
                      {currentPopupRequest.userName} wants to join
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(currentPopupRequest.timestamp)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1"
                  onClick={() => setShowJoinRequestPopup(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    handleJoinRequest(currentPopupRequest.participantId, false)
                  }
                  disabled={isLeavingCall}
                >
                  {rejectLoading ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleJoinRequest(currentPopupRequest.participantId, true)
                  }
                  disbled={acceptLoading}
                >
                  {acceptLoading ? "Accepting..." : "Accept"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-1 rounded-full flex items-center space-x-2 animate-pulse">
          <Disc2 className="h-4 w-4" />
          <span className="text-sm font-medium">Recording</span>
        </div>
      )}

      {/* Screen Sharing Indicator */}
      {isScreenSharing && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-1 rounded-full flex items-center space-x-2">
          <MonitorUp className="h-4 w-4" />
          <span className="text-sm font-medium">
            You are sharing your screen
          </span>
        </div>
      )}
    </div>
  );
}
