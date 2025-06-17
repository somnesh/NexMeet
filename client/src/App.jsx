import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/Theme";
import MeetingPage from "./pages/MeetingPage";
import MeetingNotFound from "./pages/errors/MeetingNotFound";
import OTPVerification from "./pages/OTPVerification";
import SomethingWentWrongPage from "./pages/errors/SomethingWentWrong";
import BadRequestPage from "./pages/errors/BadRequest";
import ForgotPassword from "./pages/ForgotPassword";
import NexMeetInfoPage from "./pages/NexMeetInfoPage";
import ResetPassword from "./pages/ResetPassword.jsx";

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
    path: "/:meetingCode",
    element: <MeetingPage />,
  },
  {
    path: "/verify/otp",
    element: <OTPVerification />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/info",
    element: <NexMeetInfoPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/404",
    element: <MeetingNotFound />,
  },
  {
    path: "/400",
    element: <BadRequestPage />,
  },
  {
    path: "/500",
    element: <SomethingWentWrongPage />,
  },
]);

function App() {
  const [theme, setTheme] = useState(
    localStorage.theme === "light" || !("theme" in localStorage)
      ? "light"
      : "dark"
  );
  const [triggerElement, setTriggerElement] = useState(null);

  const darkTheme = (e) => {
    setTheme("dark");
    localStorage.theme = "dark";
    setTriggerElement(e);
  };

  const lightTheme = (e) => {
    setTheme("light");
    localStorage.theme = "light";
    setTriggerElement(e);
  };

  useEffect(() => {
    document.querySelector("html").classList.remove("dark", "light");
    document.querySelector("html").classList.add(theme);
    if (triggerElement) {
      triggerElement.currentTarget.classList.add("dark:bg-white");
    }
  }, [theme]);

  return (
    <>
      <ThemeProvider value={{ theme, darkTheme, lightTheme }}>
        <Toaster richColors />
        <RouterProvider router={router} />
      </ThemeProvider>
    </>
  );
}

export default App;
