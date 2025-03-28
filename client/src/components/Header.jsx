"use client";

import { useState, useEffect } from "react";
import { Video, Settings, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update the date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Format the date and time
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(currentDateTime);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentDateTime);

  return (
    <header className="w-full py-3 px-4 md:px-6 backdrop-blur-sm bg-background/80">
      <div className="flex items-center justify-between">
        {/* Logo and App Name */}
        <div className="flex items-center space-x-2">
          <div className="bg-primary rounded-md p-1.5">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:inline-block">
            NexMeet
          </span>
        </div>

        {/* Desktop Navigation */}
        {/* <div className="hidden md:flex items-center space-x-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Features
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Pricing
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Support
          </Button>
        </div> */}

        <div className="hidden md:flex items-center space-x-2">
          {/* Date and Time - Desktop */}
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">{formattedDate}</p>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>

          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              U
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Date and Time - Mobile (Simplified) */}
          <div className="text-right mr-2">
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>

          {/* <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary rounded-md p-1.5">
                      <Video className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg">NexMeet</span>
                  </div>
                </div>

                <div className="space-y-4 py-4">
                  <div className="px-2 py-1">
                    <h2 className="mb-2 text-lg font-semibold tracking-tight">
                      Menu
                    </h2>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start">
                        Features
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        Pricing
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        Support
                      </Button>
                    </div>
                  </div>

                  <div className="px-2 py-1">
                    <h2 className="mb-2 text-lg font-semibold tracking-tight">
                      Account
                    </h2>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start">
                        Profile
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        Settings
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        Notifications
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-auto px-2">
                  <div className="pt-4 pb-2 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          U
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Guest User</p>
                        <p className="text-xs text-muted-foreground">
                          guest@example.com
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-2">
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet> */}
        </div>
      </div>
    </header>
  );
}
