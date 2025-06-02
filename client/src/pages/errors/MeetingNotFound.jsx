import { useEffect, useState } from "react";
import { Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function MeetingNotFound() {
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const APP_URL = import.meta.env.VITE_APP_URL;
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Main Content */}
      <main className="min-h-screen pt-16 pb-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full mx-auto text-center">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Meeting Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400">
              The meeting you're trying to join doesn't exist or has expired.
              Make sure you entered the correct meeting code in the URL, for
              example: {APP_URL}/xxx-yyyy-zzz
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-fit cursor-pointer py-6 rounded-full border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => {
                navigate("/", { replace: true });
              }}
            >
              <Home className="h-5 w-5 mr-2 ml-2" />
              <span className="mr-2">Return to home</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
