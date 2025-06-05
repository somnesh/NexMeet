import { useNavigate } from "react-router-dom";
import useTheme from "../contexts/Theme";

export function Footer() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleRedirectToInfo = (path) => {
    navigate("/info", { state: { path } });
  };

  return (
    <footer className="py-8 px-4 sm:px-6 border-t">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <div className="p-1.5">
              {theme === "dark" ? (
                <img
                  src="/icon-512x512.png"
                  alt="NexMeet Logo"
                  className="h-8 w-8 object-cover rounded-full"
                />
              ) : (
                <img
                  src="/logo-light-mode-512x512.png"
                  alt="NexMeet Logo"
                  className="h-8 w-8 object-cover rounded-full"
                />
              )}
            </div>
            <span className="font-bold text-lg">NexMeet</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span
              onClick={() => handleRedirectToInfo("features")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Features
            </span>
            <span
              onClick={() => handleRedirectToInfo("pricing")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Pricing
            </span>
            <span
              onClick={() => handleRedirectToInfo("support")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Support
            </span>
            <span
              onClick={() => handleRedirectToInfo("privacy")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Privacy
            </span>
            <span
              onClick={() => handleRedirectToInfo("terms")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Terms
            </span>
          </div>

          <div className="flex">
            <img
              src="/github-mark.svg"
              alt="GitHub Logo"
              className={`h-8 w-8 object-cover rounded-full cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-300 ${
                theme === "dark" ? "invert" : ""
              }`}
              onClick={() =>
                window.open("https://github.com/somnesh/NexMeet", "_blank")
              }
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
