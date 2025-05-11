import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage";
import VideoCallInterface from "./pages/VideoCallInterface";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/Theme";
import PreJoinPage from "./pages/PreJoinPage";
import MeetingPage from "./pages/MeetingPage";
import MeetingNotFound from "./pages/errors/MeetingNotFound";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/login",
    element: <AuthPage />,
  },
  {
    path: "/call",
    element: <VideoCallInterface />,
  },
  {
    path: "/join",
    element: <PreJoinPage />,
  },
  {
    path: "/:meetingCode",
    element: <MeetingPage />,
  },
  {
    path: "/404",
    element: <MeetingNotFound />,
  },
]);

function App() {
  const [theme, setTheme] = useState(
    localStorage.theme === "white" || !("theme" in localStorage)
      ? "white"
      : "dark"
  );
  const [triggerElement, setTriggerElement] = useState(null);

  const darkTheme = (e) => {
    setTheme("dark");
    localStorage.theme = "dark";
    setTriggerElement(e);
  };

  const lightTheme = (e) => {
    setTheme("white");
    localStorage.theme = "white";
    setTriggerElement(e);
  };

  useEffect(() => {
    document.querySelector("html").classList.remove("dark", "white");
    document.querySelector("html").classList.add(theme);
    if (triggerElement) {
      triggerElement.currentTarget.classList.add("dark:bg-white");
    }
  }, [theme]);

  return (
    <>
      <ThemeProvider value={{ theme, darkTheme, lightTheme }}>
        <Toaster />
        <RouterProvider router={router} />
      </ThemeProvider>
    </>
  );
}

export default App;
