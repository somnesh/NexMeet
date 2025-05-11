import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  Mic,
  Video,
  VideoOff,
  MicOff,
  Settings,
  AlertCircle,
  ChevronDown,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Header from "/src/components/Header.jsx";
import API from "../api/api";

export default function PreJoinPage({ meetingCode, setCurrentPage, isHost }) {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  });
  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: "",
    audioOutput: "",
    videoInput: "",
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem("name"));
  const [isAudioTestPlaying, setIsAudioTestPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [errors, setErrors] = useState({
    camera: false,
    microphone: false,
    speaker: false,
  });

  const videoRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioTestRef = useRef(null);

  // Check if mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Get available devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .catch((error) => {
            console.error("Error accessing media devices:", error);
            const newErrors = { ...errors };

            if (
              error.name === "NotFoundError" ||
              error.name === "DevicesNotFoundError"
            ) {
              if (error.message.includes("audio")) {
                newErrors.microphone = true;
              }
              if (error.message.includes("video")) {
                newErrors.camera = true;
              }
            } else if (
              error.name === "NotAllowedError" ||
              error.name === "PermissionDeniedError"
            ) {
              if (error.message.includes("audio")) {
                newErrors.microphone = true;
              }
              if (error.message.includes("video")) {
                newErrors.camera = true;
              }
            }

            setErrors(newErrors);
          });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput"
        );
        const audioOutputs = devices.filter(
          (device) => device.kind === "audiooutput"
        );
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput"
        );

        setDevices({ audioInputs, audioOutputs, videoInputs });

        // Check for device availability and set errors
        const newErrors = { ...errors };
        if (audioInputs.length === 0) {
          newErrors.microphone = true;
        }
        if (audioOutputs.length === 0) {
          newErrors.speaker = true;
        }
        if (videoInputs.length === 0) {
          newErrors.camera = true;
        }
        setErrors(newErrors);

        // Set default devices if available
        if (audioInputs.length > 0) {
          setSelectedDevices((prev) => ({
            ...prev,
            audioInput: audioInputs[0].deviceId,
          }));
        }

        if (audioOutputs.length > 0) {
          setSelectedDevices((prev) => ({
            ...prev,
            audioOutput: audioOutputs[0].deviceId,
          }));
        }

        if (videoInputs.length > 0) {
          setSelectedDevices((prev) => ({
            ...prev,
            videoInput: videoInputs[0].deviceId,
          }));
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        setErrors({
          camera: true,
          microphone: true,
          speaker: true,
        });
      }
    }

    getDevices();

    // Clean up on unmount
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Set up audio analyzer for microphone level visualization
  useEffect(() => {
    if (!selectedDevices.audioInput || errors.microphone) {
      // Stop any existing audio stream when microphone is muted or has errors
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        audioStreamRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    // Don't create a new stream if mic is muted - stop existing one
    if (isMicMuted) {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        audioStreamRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    let audioContext;
    let analyser;
    let source;

    async function setupAudioAnalyzer() {
      try {
        // Stop previous stream if exists
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        // Get audio stream from selected microphone
        const stream = await navigator.mediaDevices
          .getUserMedia({
            audio: { deviceId: selectedDevices.audioInput },
          })
          .catch((error) => {
            console.error("Error accessing microphone:", error);
            setErrors((prev) => ({ ...prev, microphone: true }));
            throw error;
          });

        audioStreamRef.current = stream;

        // Create audio context and analyzer
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioAnalyserRef.current = analyser;

        // Start analyzing audio levels
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
          setAudioLevel(average / 255); // Normalize to 0-1

          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch (error) {
        console.error("Error setting up audio analyzer:", error);
      }
    }

    setupAudioAnalyzer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      if (source) {
        source.disconnect();
      }

      if (audioContext) {
        audioContext.close().catch(console.error);
      }
    };
  }, [selectedDevices.audioInput, isMicMuted, errors.microphone]);

  // Set up video preview
  useEffect(() => {
    // Always stop previous stream first
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }

    // Only create a new stream if camera is on and available
    if (!selectedDevices.videoInput || !isCameraOn || errors.camera) {
      return;
    }

    async function setupVideoPreview() {
      try {
        // Get video stream from selected camera
        const stream = await navigator.mediaDevices
          .getUserMedia({
            video: { deviceId: selectedDevices.videoInput },
          })
          .catch((error) => {
            console.error("Error accessing camera:", error);
            setErrors((prev) => ({ ...prev, camera: true }));
            throw error;
          });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error setting up video preview:", error);
      }
    }

    setupVideoPreview();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    };
  }, [selectedDevices.videoInput, isCameraOn, errors.camera]);

  // Handle device selection changes
  const handleDeviceChange = (type, value) => {
    setSelectedDevices((prev) => ({ ...prev, [type]: value }));

    // Reset error state when device is changed
    if (type === "audioInput") {
      setErrors((prev) => ({ ...prev, microphone: false }));
    } else if (type === "audioOutput") {
      setErrors((prev) => ({ ...prev, speaker: false }));
    } else if (type === "videoInput") {
      setErrors((prev) => ({ ...prev, camera: false }));
    }
  };

  // Test speaker
  const testSpeaker = () => {
    if (isAudioTestPlaying || errors.speaker) return;

    // Use an actual audio file instead of SVG
    const testAudioSrc = "/test-sound.wav"; // Replace with actual path to audio file

    if (audioTestRef.current) {
      audioTestRef.current.src = testAudioSrc;
      setIsAudioTestPlaying(true);

      // audioTestRef.current.volume = speakerVolume / 100;
      audioTestRef.current.play().catch((error) => {
        console.error("Error playing audio test:", error);
        setErrors((prev) => ({ ...prev, speaker: true }));
        setIsAudioTestPlaying(false);
      });

      audioTestRef.current.onended = () => {
        setIsAudioTestPlaying(false);
      };
    }
  };

  // Join meeting
  const joinMeeting = async () => {
    setLoading(true);
    try {
      const res = await API.post(`/meeting/${meetingCode}`);
      console.log(res);

      if (res.status === 200) {
        if (res.data.participantStatus === "ACCEPTED") {
          console.log("Joining meeting...");

          setCurrentPage("call");
        }
      }
    } catch (error) {
      console.error("Error joining meeting:", error);
    }
    setLoading(false);
  };

  // Device selection dropdown component
  const DeviceDropdown = ({
    label,
    devices,
    selectedDevice,
    onChange,
    icon,
    error,
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
          {label}
          {error && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label} not found or permission denied</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Label>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-between ${
              error
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                : ""
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {icon}
              <span className="truncate">
                {error
                  ? `${label} not available`
                  : devices.find((d) => d.deviceId === selectedDevice)?.label ||
                    `Select ${label}`}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-auto">
          {devices.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => onChange(device.deviceId)}
              className="flex items-center gap-2"
            >
              {selectedDevice === device.deviceId && (
                <Check className="h-4 w-4 text-primary" />
              )}
              <span
                className={
                  selectedDevice === device.deviceId ? "font-medium" : ""
                }
              >
                {device.label || `${label} ${devices.indexOf(device) + 1}`}
              </span>
            </DropdownMenuItem>
          ))}
          {devices.length === 0 && (
            <DropdownMenuItem disabled>No devices found</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-[90vh] bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main>
        <div className="h-[90vh] flex items-center justify-between">
          <div
            className={`h-auto w-full flex justify-center items-center ${
              isMobile ? "flex-col" : "flex-row"
            }`}
          >
            {/* Video Preview Section */}
            <div
              className={`${
                isMobile ? "h-[40vh]" : "w-[100vh] h-[60vh]"
              } relative mx-2 my-3 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-2xl`}
            >
              {isCameraOn && !errors.camera ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1] rounded-2xl" // Mirror effect added here
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-[100vh] text-gray-500 dark:text-gray-400">
                  <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
                    {errors.camera ? (
                      <AlertCircle className="h-12 w-12 text-red-500" />
                    ) : (
                      <VideoOff className="h-12 w-12" />
                    )}
                  </div>
                  <span className="text-xl font-medium">
                    {errors.camera
                      ? "Camera not available"
                      : "Camera is turned off"}
                  </span>
                  {errors.camera && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md text-center">
                      Please check your camera connection or browser permissions
                    </p>
                  )}
                </div>
              )}

              {/* User name overlay */}
              {userName && (
                <div className="absolute bottom-6 left-6 px-4 py-2 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm font-medium">
                  {userName}
                </div>
              )}

              {/* Audio level indicator */}
              {!isMicMuted && !errors.microphone && (
                <div className="absolute bottom-6 right-6 flex items-end gap-1 px-2 py-3 h-[34px] bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm rounded-full">
                  {/*<Mic className="h-4 w-4 mr-2 text-gray-300" />*/}
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-all duration-150"
                      style={{
                        height: `${
                          4 +
                          (audioLevel > i * 0.125
                            ? i === 2
                              ? 6
                              : i * 3 + 6
                            : 2)
                        }px`,
                        backgroundColor:
                          audioLevel > i * 0.125
                            ? `rgba(74, 222, 128, ${0.7 + i * 0.03})`
                            : "rgba(209, 213, 219, 0.3)",
                        transform:
                          audioLevel > i * 0.125 ? "scale(1)" : "scale(0.8)",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Camera and Mic Controls */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 p-6 ">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isCameraOn ? "default" : "outline"}
                        size="icon"
                        onClick={() => {
                          if (videoRef.current && videoRef.current.srcObject) {
                            const tracks =
                              videoRef.current.srcObject.getTracks();
                            tracks.forEach((track) => {
                              track.stop();
                            });
                            videoRef.current.srcObject = null;
                          }
                          !errors.camera && setIsCameraOn(!isCameraOn);
                        }}
                        disabled={errors.camera}
                        aria-label={
                          isCameraOn ? "Turn camera off" : "Turn camera on"
                        }
                        className={`rounded-full h-14 w-14 transition-all duration-300 cursor-pointer ${
                          errors.camera
                            ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed"
                            : isCameraOn
                            ? "bg-primary hover:bg-primary/90"
                            : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {isCameraOn ? (
                          <Video className="h-6 w-6" />
                        ) : (
                          <VideoOff className="h-6 w-6" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {errors.camera
                        ? "Camera not available"
                        : isCameraOn
                        ? "Turn off camera"
                        : "Turn on camera"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={!isMicMuted ? "default" : "outline"}
                        size="icon"
                        onClick={() =>
                          !errors.microphone && setIsMicMuted(!isMicMuted)
                        }
                        disabled={errors.microphone}
                        aria-label={
                          isMicMuted ? "Unmute microphone" : "Mute microphone"
                        }
                        className={`rounded-full h-14 w-14 transition-all duration-300 cursor-pointer ${
                          errors.microphone
                            ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed"
                            : !isMicMuted
                            ? "bg-primary hover:bg-primary/90"
                            : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {!isMicMuted ? (
                          <Mic className="h-6 w-6" />
                        ) : (
                          <MicOff className="h-6 w-6" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {errors.microphone
                        ? "Microphone not available"
                        : isMicMuted
                        ? "Unmute microphone"
                        : "Mute microphone"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Settings"
                      className="rounded-full h-14 w-14 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 border-0 cursor-pointer"
                    >
                      <Settings className="h-6 w-6" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Meeting Settings</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {/* Settings content */}
                      <div className="space-y-6">
                        {/* Camera Selection */}
                        <DeviceDropdown
                          label="Camera"
                          devices={devices.videoInputs}
                          selectedDevice={selectedDevices.videoInput}
                          onChange={(value) =>
                            handleDeviceChange("videoInput", value)
                          }
                          icon={
                            <Video className="h-4 w-auto text-gray-500 dark:text-gray-400" />
                          }
                          error={errors.camera}
                        />

                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="camera-toggle"
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            Enable camera
                          </Label>
                          <Switch
                            id="camera-toggle"
                            checked={isCameraOn}
                            onCheckedChange={setIsCameraOn}
                            disabled={errors.camera}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>

                        {/* Microphone Selection */}
                        <DeviceDropdown
                          label="Microphone"
                          devices={devices.audioInputs}
                          selectedDevice={selectedDevices.audioInput}
                          onChange={(value) =>
                            handleDeviceChange("audioInput", value)
                          }
                          icon={
                            <Mic className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          }
                          error={errors.microphone}
                        />

                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="mic-toggle"
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            Enable microphone
                          </Label>
                          <Switch
                            id="mic-toggle"
                            checked={!isMicMuted}
                            onCheckedChange={(checked) =>
                              setIsMicMuted(!checked)
                            }
                            disabled={errors.microphone}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>

                        {/* Speaker Selection */}
                        <DeviceDropdown
                          label="Speaker"
                          devices={devices.audioOutputs}
                          selectedDevice={selectedDevices.audioOutput}
                          onChange={(value) =>
                            handleDeviceChange("audioOutput", value)
                          }
                          icon={
                            <Volume2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          }
                          error={errors.speaker}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={testSpeaker}
                          disabled={isAudioTestPlaying || errors.speaker}
                        >
                          {isAudioTestPlaying ? "Playing..." : "Test Speaker"}
                        </Button>

                        <audio ref={audioTestRef} className="hidden" />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Settings Panel */}
            <div
              className={`
              ${isMobile ? "h-[60vh]" : "w-2/5 h-fit"} 
              bg-white dark:bg-gray-950
              flex flex-col p-8 overflow-auto
            `}
            >
              <div className="space-y-10 max-w-md mx-auto w-full">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Ready to join?</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Configure your devices before entering
                  </p>
                </div>

                {/* Error Alerts */}
                {(errors.camera || errors.microphone || errors.speaker) && (
                  <Alert
                    variant="destructive"
                    className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Device Error</AlertTitle>
                    <AlertDescription>
                      {errors.camera && "Camera not available. "}
                      {errors.microphone && "Microphone not available. "}
                      {errors.speaker && "Speaker not available. "}
                      Please check your device connections and browser
                      permissions.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Device Quick Settings */}
                <div className="flex flex-wrap gap-4 justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        errors.camera
                          ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {errors.camera ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : isCameraOn ? (
                        <Video className="h-5 w-5" />
                      ) : (
                        <VideoOff className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Camera</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {errors.camera
                          ? "Not available"
                          : isCameraOn
                          ? "On"
                          : "Off"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        errors.microphone
                          ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {errors.microphone ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : isMicMuted ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Microphone</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {errors.microphone
                          ? "Not available"
                          : isMicMuted
                          ? "Muted"
                          : "On"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        errors.speaker
                          ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {errors.speaker ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Speaker</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {errors.speaker ? "Not available" : `Available`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Join Button */}
                <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
                  <Button
                    onClick={joinMeeting}
                    className="w-xs py-8 rounded-full bg-primary hover:bg-primary/90 text-white dark:bg-gray-800 dark:hover:bg-gray-900 font-medium text-base transition-all duration-300 cursor-pointer"
                    disabled={loading}
                  >
                    {isHost
                      ? loading
                        ? "Joining..."
                        : "Join Meeting"
                      : "Ask to Join"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
