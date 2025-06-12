import { useEffect, useState } from "react";
import {
  Video,
  Clock,
  Plus,
  ArrowRight,
  Code,
  FileText,
  Download,
  EllipsisVertical,
  Shredder,
  Trash2,
  FileX2,
  Captions,
  CaptionsOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import API from "../api/api";
import { WholePageLoader } from "../components/loaders/WholePageLoader.jsx";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MeetingsLoader from "../components/loaders/MeetingLoader";
import { toast } from "sonner";
import MarkdownDialog from "../components/MarkdownViewer";
import InviteDialog from "../components/InviteDialog";
import { DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import axios from "axios";
import useTheme from "../contexts/Theme";
import { Footer } from "../components/footer";

export default function HomePage() {
  const [meetingCode, setMeetingCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [meetingHistoryLoading, setMeetingHistoryLoading] = useState(true);
  const [meetingSummary, setMeetingSummary] = useState(null);
  const [meetingSummaryResponse, setMeetingSummaryResponse] = useState(null);
  const [open, setOpen] = useState(false);
  const [openSummary, setOpenSummary] = useState(false);

  const APP_URL = import.meta.env.VITE_APP_URL;
  const MEDIA_SERVER_URL = import.meta.env.VITE_MEDIA_SERVER_URL;
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthRedirect = urlParams.get("oauth") === "success";

    if (isOAuthRedirect) {
      console.log("User came from OAuth redirect");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Fetch user profile
      fetchUserProfile();
    }

    validateToken();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await API.get("/oauth/profile");
      if (response.status === 200) {
        console.log("User data stored:", response.data);
        localStorage.setItem("avatar", response.data.avatar);
        localStorage.setItem("id", response.data.id);
        localStorage.setItem("name", response.data.name);
        localStorage.setItem("email", response.data.email);
        // Show success toast
        toast.success("Login successful!");
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const validateToken = async () => {
    try {
      setLoading(true);
      const res = await API.get("/auth/validate-token");
      console.log(res);
      if (res.status === 200) {
        console.log("Token is valid");
      } else {
        console.log("Token is invalid");
      }
    } catch (error) {
      console.log(error);
      localStorage.removeItem("avatar");
      localStorage.removeItem("id");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      navigate("/login", { replace: true });
    }
    setLoading(false);
  };

  useEffect(() => {
    validateToken();
  }, []);

  // Handle joining a meeting
  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    setCodeError("");
    let formattedCode;

    if (!meetingCode.trim()) {
      setCodeError("Please enter a meeting code");
      return;
    }

    // Validate meeting code format
    const codeRegex = /^([a-zA-Z]{10}|[a-zA-Z]{3}-[a-zA-Z]{4}-[a-zA-Z]{3})$/;
    if (!codeRegex.test(meetingCode.trim())) {
      setCodeError(
        "Invalid meeting code format. Use abc-defg-hij or abcdefghij"
      );
      return;
    }

    if (meetingCode.length === 10) {
      const cleanedCode = meetingCode.toLowerCase().trim();
      formattedCode = `${cleanedCode.slice(0, 3)}-${cleanedCode.slice(
        3,
        7
      )}-${cleanedCode.slice(7, 10)}`;
    } else {
      formattedCode = meetingCode.toLowerCase().trim();
    }

    setIsJoining(true);

    navigate(`/${formattedCode}`);

    setIsJoining(false);
  };

  // Handle creating a new meeting
  const handleCreateMeeting = async () => {
    try {
      console.log("Creating new meeting");
      setIsCreating(true);

      const res = await API.post("/meeting");
      console.log(res);
      if (res.status === 200) {
        navigate(`/${res.data.code}`);
      }
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create meeting:", error);
      setIsCreating(false);
      toast.error("Failed to create meeting. Please try again.");
    }
  };

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await API.get("/meeting/all");
        console.log("Meetings response:", response.data);
        const formattedMeetings = formatMeetingData(response.data);
        setRecentMeetings(formattedMeetings);
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
      } finally {
        setMeetingHistoryLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const formatMeetingData = (apiResponse) => {
    return Object.keys(apiResponse).map((meetingId) => {
      const meeting = apiResponse[meetingId];

      // Calculate relative date
      const getRelativeDate = (dateString) => {
        const now = new Date();
        const meetingDate = new Date(dateString);
        const diffInMs = now - meetingDate;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
          return "Today";
        } else if (diffInDays === 1) {
          return "Yesterday";
        } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
        } else if (diffInDays < 30) {
          const weeks = Math.floor(diffInDays / 7);
          return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
        } else {
          const months = Math.floor(diffInDays / 30);
          return months === 1 ? "1 month ago" : `${months} months ago`;
        }
      };

      // Calculate duration
      const calculateDuration = (startTime, endTime) => {
        if (!endTime) {
          return "In progress"; // For active meetings
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffInMs = end - start;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInMinutes < 60) {
          return `${diffInMinutes} min`;
        } else {
          const hours = Math.floor(diffInMinutes / 60);
          const remainingMinutes = diffInMinutes % 60;
          if (remainingMinutes === 0) {
            return `${hours} hr`;
          } else {
            return `${hours} hr ${remainingMinutes} min`;
          }
        }
      };

      return {
        id: meeting.id,
        title: meeting.title,
        date: getRelativeDate(meeting.createdAt),
        duration: calculateDuration(meeting.startTime, meeting.endTime),
        code: meeting.code,
        mediaRoomId: meeting.mediaRoomId,
        createdAt: meeting.createdAt,
        recordingUrl: meeting.recordingUrl,
        transcriptionId: meeting.transcriptionId,
        summaryId: meeting.summaryId,
        host: meeting.host,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
        participants: 1, // Default to 1 (host), you might want to fetch actual participant count
      };
    });
  };

  const handleDownloadRecording = (meeting) => {
    if (meeting.recordingUrl) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = addFlAttachment(meeting.recordingUrl);
      link.download = `${meeting.title}-recording.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleViewSummary = async (meeting) => {
    try {
      const response = await API.get(`/meeting/summary/${meeting.code}`);
      console.log("Summary response:", response.data);

      // Format the summary data into a readable paragraph
      const formatSummary = (summaryData) => {
        const { summary } = summaryData;

        let formattedText = `**Meeting Title:** ${summary.title}\n\n`;
        formattedText += `**Duration:** ${summary.duration}\n\n`;
        formattedText += `**Summary:** ${summary.summary}\n\n`;

        if (summary.keyPoints && summary.keyPoints.length > 0) {
          formattedText += `**Key Points:**\n${summary.keyPoints
            .map((point) => `• ${point}`)
            .join("\n")}\n\n`;
        }

        if (summary.topics && summary.topics.length > 0) {
          formattedText += `**Topics Discussed:**\n${summary.topics
            .map((topic) => `• ${topic}`)
            .join("\n")}\n\n`;
        }

        if (summary.participants && summary.participants.length > 0) {
          formattedText += `**Participants:**\n${summary.participants
            .map((participant) => `• ${participant}`)
            .join("\n")}\n\n`;
        }

        if (summary.decisions && summary.decisions.length > 0) {
          formattedText += `**Decisions Made:**\n${summary.decisions
            .map((decision) => `• ${decision}`)
            .join("\n")}\n\n`;
        }

        if (summary.actionItems && summary.actionItems.length > 0) {
          formattedText += `**Action Items:**\n${summary.actionItems
            .map((item) => `• ${item}`)
            .join("\n")}\n\n`;
        }

        if (summary.nextSteps && summary.nextSteps.length > 0) {
          formattedText += `**Next Steps:**\n${summary.nextSteps
            .map((step) => `• ${step}`)
            .join("\n")}`;
        }

        return formattedText.trim();
      };

      const formattedSummary = formatSummary(response.data);
      console.log("Formatted Summary:", formattedSummary);

      // Cheeck if the summaryId in the meeting object is null or not (if null update the summaryId in the meeting object)
      if (!meeting.summaryId) {
        // Update the meeting object with the summaryId
        setRecentMeetings((prevMeetings) =>
          prevMeetings.map((m) => {
            if (m.id === meeting.id) {
              return { ...m, summaryId: response.data.summaryId };
            }
            return m;
          })
        );
      }

      setOpenSummary(true);
      setMeetingSummaryResponse(response.data);
      setMeetingSummary(formattedSummary);
      setOpen(true);
    } catch (error) {
      console.error("Error viewing summary:", error);
      throw new Error("Failed to fetch meeting summary");
    }
  };

  function addFlAttachment(url) {
    const insertPoint = "/upload/";
    if (!url.includes(insertPoint)) {
      console.error("Invalid Cloudinary URL format.");
      return url;
    }

    return url.replace(insertPoint, `${insertPoint}fl_attachment/`);
  }

  const handleDownloadTranscription = async (meeting) => {
    try {
      const response = await API.get(
        `/meeting/download-transcription/${meeting.code}`,
        {
          responseType: "blob", // Important for file downloads
        }
      );

      // Rest of the code remains the same...
      const blob = new Blob([response.data], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers["content-disposition"];
      let filename = `meeting-transcription-${meeting.code}.txt`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download transcription:", error);
      toast.error("Failed to download transcription.");
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      const response = await API.delete(`/meeting/${meetingId}`);
      if (response.status === 200) {
        setRecentMeetings((prevMeetings) =>
          prevMeetings.filter((meeting) => meeting.id !== meetingId)
        );
      }
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      throw new Error("Failed to delete meeting");
    }
  };

  const handleDeleteRecording = async (publicURL) => {
    console.log("Deleting recording:", publicURL);
    try {
      const publicId = publicURL.split("/").slice(-2)[1].split(".")[0];
      const response = await axios.delete(
        `${MEDIA_SERVER_URL}/api/delete-recording/${publicId}`,
        {
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        setRecentMeetings((prevMeetings) =>
          prevMeetings.map((meeting) => {
            if (meeting.recordingUrl === publicURL) {
              return { ...meeting, recordingUrl: null };
            }
            return meeting;
          })
        );
      }
    } catch (error) {
      console.error("Failed to delete recording:", error);
      throw new Error("Failed to delete recording");
    }
  };

  const handleDeleteTranscription = async (transcriptionId) => {
    try {
      await API.delete(`/meeting/transcription/${transcriptionId}`);
      setRecentMeetings((prevMeetings) =>
        prevMeetings.map((meeting) => {
          if (meeting.transcriptionId === transcriptionId) {
            return { ...meeting, transcriptionId: null };
          }
          return meeting;
        })
      );
    } catch (error) {
      console.error("Failed to delete transcription:", error);
      throw new Error("Failed to delete transcription");
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    try {
      await API.delete(`/meeting/summary/${summaryId}`);
      setRecentMeetings((prevMeetings) =>
        prevMeetings.map((meeting) => {
          if (meeting.summaryId === summaryId) {
            return { ...meeting, summaryId: null };
          }
          return meeting;
        })
      );
      setMeetingSummary(null);
    } catch (error) {
      console.error("Failed to delete summary:", error);
      throw new Error("Failed to delete summary");
    }
  };

  return (
    <>
      {loading ? (
        <WholePageLoader />
      ) : (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
          <Header setPageLoading={setLoading} />

          <main className="flex-1">
            {/* Hero Section */}
            <section className="py-12 md:py-16 lg:py-20 px-4 sm:px-6">
              <div className="container mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both">
                      Connect with anyone,{" "}
                      <span className="text-primary">anywhere</span>
                    </h1>
                    <p className="md:text-xl text-muted-foreground animate-in fade-in slide-in-from-left-4 duration-700 delay-100 fill-mode-both">
                      High-quality video meetings for teams and individuals.
                      Join or start a meeting with a single click.
                    </p>

                    <div className="pt-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-200 fill-mode-both">
                      <form
                        onSubmit={handleJoinMeeting}
                        className="flex flex-col sm:flex-row gap-3"
                      >
                        <div className="flex-1">
                          <Input
                            type="text"
                            autoFocus
                            placeholder="Enter meeting code (e.g., abc-mnop-xyz or abcmnopxyz)"
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                            className={`h-12 md:text-base text-sm ${
                              codeError ? "border-destructive" : ""
                            }`}
                          />
                          {codeError && (
                            <p className="text-destructive text-sm mt-1">
                              {codeError}
                            </p>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className="h-12 px-6 cursor-pointer"
                          disabled={isJoining}
                        >
                          {isJoining ? "Joining..." : "Join Meeting"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </form>
                    </div>

                    <div className="flex items-center pt-2 animate-in fade-in slide-in-from-left-4 duration-700 delay-300 fill-mode-both">
                      <div className="border-t flex-1"></div>
                      <span className="px-4 text-sm text-muted-foreground">
                        or
                      </span>
                      <div className="border-t flex-1"></div>
                    </div>

                    <Button
                      onClick={handleCreateMeeting}
                      variant="outline"
                      className="h-12 px-6 animate-in fade-in slide-in-from-left-4 duration-700 delay-400 fill-mode-both cursor-pointer"
                      disabled={isCreating}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {isCreating ? "Creating..." : "Create New Meeting"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Meetings Section */}
            <section className="py-10 px-4 sm:px-6 bg-muted/30">
              <div className="container mx-auto max-w-6xl">
                <Tabs defaultValue="recent" className="w-full">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your Meetings</h2>
                    <TabsList>
                      <TabsTrigger value="recent" className={"cursor-pointer"}>
                        Recent
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {meetingHistoryLoading ? (
                    <MeetingsLoader />
                  ) : recentMeetings.length > 0 ? (
                    <TabsContent value="recent" className="mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentMeetings.map((meeting) => (
                          <Card key={meeting.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">
                                    {meeting.title}
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{meeting.date}</span>
                                    <span className="mx-1">•</span>
                                    <span>{meeting.duration}</span>
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                  <InviteDialog
                                    meetingCode={meeting.code}
                                    meetingUrl={`${APP_URL}/${meeting.code}`}
                                    onlyIcon={
                                      meeting.recordingUrl ? false : true
                                    }
                                  />

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
                                      >
                                        <EllipsisVertical className="h-4 w-4" />
                                        <span className="sr-only">
                                          Open menu
                                        </span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-56"
                                    >
                                      {(meeting.transcriptionId ||
                                        meeting.summaryId) && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            toast.promise(
                                              handleViewSummary(meeting),
                                              {
                                                loading:
                                                  "Generating summary...",
                                                success: "Summary generated",
                                                error:
                                                  "Failed to generate summary",
                                              }
                                            )
                                          }
                                          className="cursor-pointer"
                                        >
                                          <FileText className="mr-2 h-4 w-4" />
                                          {meeting.summaryId
                                            ? "Summary of recording"
                                            : "Generate summary"}
                                        </DropdownMenuItem>
                                      )}
                                      {meeting.recordingUrl && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleDownloadRecording(meeting)
                                          }
                                          className="cursor-pointer"
                                        >
                                          <Download className="mr-2 h-4 w-4" />
                                          Download video recording
                                        </DropdownMenuItem>
                                      )}
                                      {meeting.transcriptionId && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            toast.promise(
                                              handleDownloadTranscription(
                                                meeting
                                              ),
                                              {
                                                loading: "Downloading...",
                                                success:
                                                  "Transcription downloaded",
                                                error:
                                                  "Failed to download transcription",
                                              }
                                            )
                                          }
                                          className="cursor-pointer"
                                        >
                                          <Captions className="mr-2 h-4 w-4" />
                                          Download transciption
                                        </DropdownMenuItem>
                                      )}
                                      {(meeting.summaryId ||
                                        meeting.transcriptionId ||
                                        meeting.recordingUrl) && (
                                        <DropdownMenuSeparator />
                                      )}
                                      {meeting.summaryId && (
                                        <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() =>
                                            toast.promise(
                                              handleDeleteSummary(
                                                meeting.summaryId
                                              ),
                                              {
                                                loading: "Deleting summary...",
                                                success:
                                                  "Summary deleted successfully",
                                                error:
                                                  "Failed to delete summary",
                                              }
                                            )
                                          }
                                        >
                                          <Shredder className="mr-2 h-4 w-4 text-red-500" />
                                          <span className="text-red-500">
                                            Delete summary
                                          </span>
                                        </DropdownMenuItem>
                                      )}
                                      {meeting.recordingUrl && (
                                        <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() =>
                                            toast.promise(
                                              handleDeleteRecording(
                                                meeting.recordingUrl
                                              ),
                                              {
                                                loading:
                                                  "Deleting recording...",
                                                success:
                                                  "Recording deleted successfully",
                                                error:
                                                  "Failed to delete recording",
                                              }
                                            )
                                          }
                                        >
                                          <FileX2 className="mr-2 h-4 w-4 text-red-500" />
                                          <span className="text-red-500">
                                            Delete recording
                                          </span>
                                        </DropdownMenuItem>
                                      )}

                                      {meeting.transcriptionId && (
                                        <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() =>
                                            toast.promise(
                                              handleDeleteTranscription(
                                                meeting.transcriptionId
                                              ),
                                              {
                                                loading:
                                                  "Deleting transcription...",
                                                success:
                                                  "Transcription deleted successfully",
                                                error:
                                                  "Failed to delete transcription",
                                              }
                                            )
                                          }
                                        >
                                          <CaptionsOff className="mr-2 h-4 w-4 text-red-500" />
                                          <span className="text-red-500">
                                            Delete transcription
                                          </span>
                                        </DropdownMenuItem>
                                      )}

                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() =>
                                          toast.promise(
                                            handleDeleteMeeting(meeting.id),
                                            {
                                              loading: "Deleting meeting...",
                                              success:
                                                "Meeting deleted successfully",
                                              error: "Failed to delete meeting",
                                            }
                                          )
                                        }
                                      >
                                        <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                        <span className="text-red-500">
                                          Delete meeting
                                        </span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {meeting.code}
                                </span>
                              </div>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                              {meeting.recordingUrl && (
                                <Button
                                  variant="outline"
                                  className="flex-1 cursor-pointer"
                                  onClick={() =>
                                    window.open(
                                      `${meeting.recordingUrl}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  View Recording
                                </Button>
                              )}
                              <Button
                                variant="default"
                                className="flex-1 cursor-pointer"
                                onClick={() => navigate(`/${meeting.code}`)}
                              >
                                Join again
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                      {openSummary && (
                        <MarkdownDialog
                          trigger={meetingSummary.length > 0}
                          content={meetingSummary}
                          code={meetingSummaryResponse?.meetingCode}
                          isOpen={openSummary}
                          setIsOpen={setOpenSummary}
                        />
                      )}
                    </TabsContent>
                  ) : (
                    <TabsContent
                      value="recent"
                      className="mt-0 flex justify-center items-center"
                    >
                      <div className="text-center bg-card outline-1 border-muted rounded-lg w-fit p-6">
                        🔮 Your meeting history will appear here once you have
                        created meetings. 🪄
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </section>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      )}
    </>
  );
}
