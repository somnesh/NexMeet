import { useState, useEffect } from "react";
import { Video } from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";

export default function Header({ setPageLoading }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

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
        <div className="flex items-center">
          <div className=" object-cover p-1.5">
            <img
              src="/icon-512x512.png"
              alt="NexMeet Logo"
              className="h-8 w-8 object-cover rounded-full"
            />
          </div>
          <span className="font-bold text-lg sm:inline-block">NexMeet</span>
        </div>

        <div className="hidden md:flex items-center space-x-2">
          {/* Date and Time - Desktop */}
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">{formattedDate}</p>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
          {localStorage.name && (
            <>
              <div> • </div>
              <div className="flex flex-col items-end">
                <span>{localStorage.name}</span>
                <span className="text-xs">{localStorage.email}</span>
              </div>
            </>
          )}

          <ProfileMenu setPageLoading={setPageLoading} />
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Date and Time - Mobile (Simplified) */}
          <div className="text-right mr-2">
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
          <ProfileMenu setPageLoading={setPageLoading} />
        </div>
      </div>
    </header>
  );
}
