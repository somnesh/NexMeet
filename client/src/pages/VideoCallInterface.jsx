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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoOffIcon as RecordOff } from "lucide-react";
import mediaSoupService from "/src/services/mediaSoupService.js";
import stompService from "/src/services/stompService.js";
import { Card } from "@/components/ui/card";
import API from "/src/api/api.js";
import { toast } from "sonner"


export default function VideoCallInterface({
  meetingCode,
  getMeetingResponse,
}) {
  // State for UI controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [layout, setLayout] = useState("grid"); // grid, spotlight, sidebar
  const [isLeavingCall, setIsLeavingCall] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // State for user media
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(80);
  const [videoStream, setVideoStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  // State to store remote streams
  const [remoteStreams, setRemoteStreams] = useState({});
  const remoteStreamRefs = useRef({});
  const [localStream, setLocalStream] = useState(null);
  const videoRefs = useRef({});

  // State for chat
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "Alex Thompson",
      initials: "AT",
      message: "Hi everyone! Can you all see my screen?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      isCurrentUser: false,
    },
    {
      id: 2,
      sender: "Blake Rivera",
      initials: "BR",
      message: "Yes, I can see it clearly.",
      timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 minutes ago
      isCurrentUser: false,
    },
    {
      id: 3,
      sender: "You",
      initials: "YO",
      message: "I can see it too. Let's discuss the project timeline.",
      timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
      isCurrentUser: true,
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  // State for participants
  const [participants, setParticipants] = useState([
    {
      participantId: 1,
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

        stompService.subscribe(`/topic/room/${meetingCode}`, (data) => {
          console.log("Room update received:", data);
          if (data.type === "PARTICIPANT_JOINED") {
            console.log("Participant joined:", data);
            toast(`${data.name} joined`);
            data.isCurrentUser = data.userId === localStorage.userId;
            setParticipants((prev) => [...prev, data]);
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

        mediaSoupService.on("peerLeft", ({ peerId }) => {
          console.log(`Handling peer left: ${peerId}`);
          toast("left the meeting");
          // Remove participant from the list
          setParticipants((prevParticipants) =>
              prevParticipants.filter(participant => participant.id !== peerId)
          );
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
  console.log("Participants after useEffect: ", participants);

  useEffect(() => {
    (async ()=> await joinRoom())();
  },[joinRequests]);

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
      (async ()=> {if (isMediaSoupInitialized) await initializeLocalMedia();})();


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
      sender: "You",
      initials: "YO",
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
  const handleLeaveCall = () => {
    setIsLeavingCall(true);

    // Simulate leaving the call
    setTimeout(() => {
      console.log("Left the call");
      // Here you would redirect to the home page or meeting ended page
      window.location.href = "/";
    }, 1500);
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
    mediaSoupService.on("newConsumer", handleNewConsumer);
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
                        className="w-full h-full object-cover"
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
                          className="w-full h-full object-cover"
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
                      className="w-full h-full object-cover"
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
                        className=" h-full object-cover"
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
                              el.play().catch(e => console.warn("Local video play failed:", e));

                            }
                          } else {
                            // Set ref for remote participant
                            videoRefs.current[participant.userId] = el;

                            // Check if we have a remote stream for this participant
                            if (remoteStreams[participant.id]) {
                              console.log(
                                "Found remote stream for",
                                participant.name
                              );

                              // Create a new MediaStream with video and audio tracks
                              const stream = new MediaStream();

                              // Add video track if available
                              if (remoteStreams[participant.id].video) {
                                stream.addTrack(
                                  remoteStreams[participant.id].video
                                );
                                console.log("Added video track");
                              }

                              // Add audio track if available
                              if (remoteStreams[participant.id].audio) {
                                stream.addTrack(
                                  remoteStreams[participant.id].audio
                                );
                                console.log("Added audio track");
                              }

                              console.log("Check mediastream: ", stream.getVideoTracks());
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
                                setTimeout(() => {
                                  el.play().catch(error => {
                                    console.error("Error auto-playing video:", error);

                                    // Create a play button if autoplay fails
                                    const playButton = document.createElement('button');
                                    playButton.textContent = 'Click to play video';
                                    playButton.style.position = 'absolute';
                                    playButton.style.zIndex = '10';
                                    playButton.style.top = '50%';
                                    playButton.style.left = '50%';
                                    playButton.style.transform = 'translate(-50%, -50%)';
                                    playButton.style.padding = '10px';

                                    playButton.onclick = () => {
                                      el.play();
                                      playButton.remove();
                                    };

                                    el.parentNode.appendChild(playButton);
                                  });
                                }, 500);

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
                  <TabsTrigger value="chat" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
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

                <TabsContent
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
                </TabsContent>

                <TabsContent
                  value="participants"
                  className="flex-1 p-0 m-0 overflow-y-auto"
                >
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">In this call</h3>
                      <Button variant="outline" size="sm" className="h-8">
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
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
            <TooltipProvider>
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
            </TooltipProvider>

            {/* Layout Toggle */}
            <TooltipProvider>
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
            </TooltipProvider>

            {/* Recording */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRecording ? "default" : "ghost"}
                    size="icon"
                    className={`rounded-full h-12 w-12 ${
                      isRecording ? "animate-pulse" : ""
                    }`}
                    onClick={() => setIsRecording(!isRecording)}
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

            <div className="h-8 border-l mx-1"></div>

            {/* Chat Toggle */}
            <TooltipProvider>
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
            </TooltipProvider>

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
            <TooltipProvider>
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
                                className="w-full h-full object-cover rounded-md"
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
            </TooltipProvider>

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
                <TooltipContent>Leave call</TooltipContent>
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
