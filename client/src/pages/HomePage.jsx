"use client";

import { useEffect, useState } from "react";
import {
  Video,
  Calendar,
  Users,
  Shield,
  Clock,
  Plus,
  ArrowRight,
  MessageSquare,
  Zap,
  CheckCircle2,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import API from "../api/api";
import { WholePageLoader } from "../components/loaders/WholePageLoader.jsx";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

export default function HomePage() {
  const [meetingCode, setMeetingCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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
      navigate("/login");
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
      const cleanedCode = meetingCode.trim();
      formattedCode = `${cleanedCode.slice(0, 3)}-${cleanedCode.slice(
        3,
        7
      )}-${cleanedCode.slice(7, 10)}`;
    } else {
      formattedCode = meetingCode;
    }

    setIsJoining(true);

    navigate(`/${formattedCode}`);

    setIsJoining(false);
  };

  // Handle creating a new meeting
  const handleCreateMeeting = async () => {
    console.log("Creating new meeting");
    setIsCreating(true);

    const res = await API.post("/meeting");
    console.log(res);
    if (res.status === 200) {
      navigate(`/${res.data.code}`);
    }
    setIsCreating(false);
  };

  // Mock data for upcoming meetings
  const upcomingMeetings = [
    {
      id: 1,
      title: "Weekly Team Standup",
      time: "Today, 2:00 PM",
      duration: "30 min",
      participants: [
        { name: "Alex", image: null, initials: "A" },
        { name: "Blake", image: null, initials: "B" },
        { name: "Casey", image: null, initials: "C" },
        { name: "Dana", image: null, initials: "D" },
      ],
      isRecurring: true,
    },
    {
      id: 2,
      title: "Project Review",
      time: "Tomorrow, 10:00 AM",
      duration: "1 hr",
      participants: [
        { name: "Alex", image: null, initials: "A" },
        { name: "Eliot", image: null, initials: "E" },
        { name: "Francis", image: null, initials: "F" },
      ],
      isRecurring: false,
    },
    {
      id: 3,
      title: "Client Presentation",
      time: "Wed, 3:30 PM",
      duration: "45 min",
      participants: [
        { name: "Blake", image: null, initials: "B" },
        { name: "Casey", image: null, initials: "C" },
        { name: "Eliot", image: null, initials: "E" },
        { name: "Guest", image: null, initials: "G" },
      ],
      isRecurring: false,
    },
  ];

  // Mock data for recent meetings
  const recentMeetings = [
    {
      id: 101,
      title: "Product Strategy",
      date: "Yesterday",
      duration: "52 min",
      participants: 6,
    },
    {
      id: 102,
      title: "Design Review",
      date: "2 days ago",
      duration: "1 hr 15 min",
      participants: 4,
    },
    {
      id: 103,
      title: "Marketing Sync",
      date: "3 days ago",
      duration: "45 min",
      participants: 5,
    },
  ];

  return (
    <>
      {loading ? (
        <WholePageLoader />
      ) : (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
          <Header />

          <main className="flex-1">
            {/* Hero Section */}
            <section className="py-12 md:py-16 lg:py-20 px-4 sm:px-6">
              <div className="container mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both">
                      Connect with anyone,{" "}
                      <span className="text-primary">anywhere</span>
                    </h1>
                    <p className="text-xl text-muted-foreground animate-in fade-in slide-in-from-left-4 duration-700 delay-100 fill-mode-both">
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
                            placeholder="Enter meeting code (e.g., abc-mnop-xyz or abcmnopxyz)"
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                            className={`h-12 text-base ${
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

                  {/*<div className="relative rounded-xl overflow-hidden border shadow-xl animate-in fade-in slide-in-from-right-4 duration-700 fill-mode-both">*/}
                  {/*  <div className="aspect-video bg-muted/30 relative">*/}
                  {/*    <div className="absolute inset-0 flex items-center justify-center">*/}
                  {/*      <div className="text-center p-6">*/}
                  {/*        <Video className="h-16 w-16 mx-auto text-primary mb-4 opacity-80" />*/}
                  {/*        <h3 className="text-xl font-medium">*/}
                  {/*          Your video preview will appear here*/}
                  {/*        </h3>*/}
                  {/*        <p className="text-muted-foreground mt-2">*/}
                  {/*          Join a meeting to start your video conference*/}
                  {/*        </p>*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*  </div>*/}
                  {/*</div>*/}
                </div>
              </div>
            </section>

            {/* Meetings Section */}
            <section className="py-10 px-4 sm:px-6 bg-muted/30">
              <div className="container mx-auto max-w-6xl">
                <Tabs defaultValue="upcoming" className="w-full">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your Meetings</h2>
                    <TabsList>
                      <TabsTrigger
                        value="upcoming"
                        className={"cursor-pointer"}
                      >
                        Upcoming
                      </TabsTrigger>
                      <TabsTrigger value="recent" className={"cursor-pointer"}>
                        Recent
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="upcoming" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {upcomingMeetings.map((meeting) => (
                        <Card
                          key={meeting.id}
                          className="overflow-hidden transition-all hover:shadow-md"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {meeting.title}
                              </CardTitle>
                              {meeting.isRecurring && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>Recurring</span>
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{meeting.time}</span>
                              <span className="mx-1">•</span>
                              <span>{meeting.duration}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <div className="flex -space-x-2">
                              {meeting.participants
                                .slice(0, 4)
                                .map((participant, index) => (
                                  <Avatar
                                    key={index}
                                    className="border-2 border-background h-8 w-8"
                                  >
                                    {participant.image ? (
                                      <AvatarImage
                                        src={participant.image}
                                        alt={participant.name}
                                      />
                                    ) : (
                                      <AvatarFallback className="text-xs">
                                        {participant.initials}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                ))}
                              {meeting.participants.length > 4 && (
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-medium">
                                  +{meeting.participants.length - 4}
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="pt-0">
                            <Button
                              variant="default"
                              className="w-full cursor-pointer"
                            >
                              Join Now
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}

                      <Card className="border-dashed flex flex-col items-center justify-center p-6 h-full cursor-pointer">
                        <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-center mb-4">
                          Schedule a new meeting
                        </p>
                        <Button variant="outline" className={"cursor-pointer"}>
                          Schedule
                        </Button>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="recent" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentMeetings.map((meeting) => (
                        <Card key={meeting.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {meeting.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{meeting.date}</span>
                              <span className="mx-1">•</span>
                              <span>{meeting.duration}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {meeting.participants} participants
                              </span>
                            </div>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            <Button variant="outline" className="flex-1">
                              View Recording
                            </Button>
                            <Button variant="default" className="flex-1">
                              Restart
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </section>

            {/*/!* Features Section *!/*/}
            {/*<section className="py-16 px-4 sm:px-6">*/}
            {/*  <div className="container mx-auto max-w-6xl">*/}
            {/*    <div className="text-center mb-12">*/}
            {/*      <h2 className="text-3xl font-bold mb-4">Why Choose NexMeet</h2>*/}
            {/*      <p className="text-muted-foreground max-w-2xl mx-auto">*/}
            {/*        Our platform provides everything you need for seamless video*/}
            {/*        conferencing with your team or clients.*/}
            {/*      </p>*/}
            {/*    </div>*/}

            {/*    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">*/}
            {/*      <Card className="bg-card/50 border">*/}
            {/*        <CardHeader>*/}
            {/*          <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-2">*/}
            {/*            <Video className="h-6 w-6 text-primary" />*/}
            {/*          </div>*/}
            {/*          <CardTitle>HD Video Quality</CardTitle>*/}
            {/*          <CardDescription>*/}
            {/*            Crystal clear video and audio for professional meetings*/}
            {/*          </CardDescription>*/}
            {/*        </CardHeader>*/}
            {/*        <CardContent>*/}
            {/*          <ul className="space-y-2">*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Up to 1080p video resolution</span>*/}
            {/*            </li>*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Noise cancellation</span>*/}
            {/*            </li>*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Background blur</span>*/}
            {/*            </li>*/}
            {/*          </ul>*/}
            {/*        </CardContent>*/}
            {/*      </Card>*/}

            {/*      <Card className="bg-card/50 border">*/}
            {/*        <CardHeader>*/}
            {/*          <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-2">*/}
            {/*            <Shield className="h-6 w-6 text-primary" />*/}
            {/*          </div>*/}
            {/*          <CardTitle>Secure Meetings</CardTitle>*/}
            {/*          <CardDescription>*/}
            {/*            Enterprise-grade security for all your conversations*/}
            {/*          </CardDescription>*/}
            {/*        </CardHeader>*/}
            {/*        <CardContent>*/}
            {/*          <ul className="space-y-2">*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>End-to-end encryption</span>*/}
            {/*            </li>*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Meeting passcodes</span>*/}
            {/*            </li>*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Waiting rooms</span>*/}
            {/*            </li>*/}
            {/*          </ul>*/}
            {/*        </CardContent>*/}
            {/*      </Card>*/}

            {/*      <Card className="bg-card/50 border">*/}
            {/*        <CardHeader>*/}
            {/*          <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-2">*/}
            {/*            <MessageSquare className="h-6 w-6 text-primary" />*/}
            {/*          </div>*/}
            {/*          <CardTitle>Collaboration Tools</CardTitle>*/}
            {/*          <CardDescription>*/}
            {/*            Work together effectively with built-in features*/}
            {/*          </CardDescription>*/}
            {/*        </CardHeader>*/}
            {/*        <CardContent>*/}
            {/*          <ul className="space-y-2">*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Screen sharing</span>*/}
            {/*            </li>*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Chat messaging</span>*/}
            {/*            </li>*/}
            {/*            <li className="flex items-center gap-2">*/}
            {/*              <CheckCircle2 className="h-4 w-4 text-primary" />*/}
            {/*              <span>Interactive whiteboard</span>*/}
            {/*            </li>*/}
            {/*          </ul>*/}
            {/*        </CardContent>*/}
            {/*      </Card>*/}
            {/*    </div>*/}
            {/*  </div>*/}
            {/*</section>*/}
          </main>

          {/* Footer */}
          <footer className="py-8 px-4 sm:px-6 border-t">
            <div className="container mx-auto max-w-6xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary rounded-md p-1.5">
                    <Video className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg">NexMeet</span>
                </div>

                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Support
                  </a>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy
                  </a>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Terms
                  </a>
                </div>

                <div className="text-sm text-muted-foreground">
                  © 2025 NexMeet. All rights reserved.
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
