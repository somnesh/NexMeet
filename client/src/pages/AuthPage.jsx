import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  Video,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import Header from "../components/Header";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AuthPage() {
  // State for sign in form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // State for sign up form
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] =
    useState(false);

  // Loading states
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);

  // Add a state to track the active tab for additional animation control
  const [activeTab, setActiveTab] = useState("signin");

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const SERVER_URL = import.meta.env.VITE_SERVER_URL;
  const MEDIA_SERVER_URL = import.meta.env.VITE_MEDIA_SERVER_URL;

  // Add a function to handle tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  // Handle sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInError("");

    // Validate form
    if (!signInEmail || !signInPassword) {
      setSignInError("Please fill in all fields");
      return;
    }

    try {
      setIsSigningIn(true);
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: signInEmail,
          password: signInPassword,
        },
        { withCredentials: true }
      );

      console.log(response.data);
      localStorage.setItem("avatar", response.data.avatar);
      localStorage.setItem("id", response.data.id);
      localStorage.setItem("name", response.data.name);
      localStorage.setItem("email", response.data.email);
      if (response.status === 200) {
        navigate("/", { replace: true });
      }
    } catch (error) {
      setSignInError("Incorrect email or password");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle sign up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setSignUpError("");

    // Validate form
    if (
      !signUpEmail ||
      !signUpPassword ||
      !signUpConfirmPassword ||
      !signUpName
    ) {
      setSignUpError("Please fill in all fields");
      return;
    }

    if (signUpName.length < 3) {
      setSignUpError("Name must have at least 3 characters");
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError("Passwords do not match");
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError("Password must be at least 6 characters");
      return;
    }

    setIsSigningUp(true);
    toast.promise(generateOTP(signUpName, signUpEmail, signUpPassword), {
      loading: "Generating OTP...",
      success: "OTP sent successfully! Please check your email.",
      error: (error) => {
        return (
          error.response?.data?.msg || "An error occurred while generating OTP"
        );
      },
    });
  };

  const generateOTP = async (name, email, password) => {
    try {
      await axios.post(`${MEDIA_SERVER_URL}/api/otp/request`, {
        email,
        name,
        purpose: "signup",
      });

      const userObject = {
        name: name,
        email: email,
        password: password,
      };

      // Set session flag to indicate valid signup flow
      sessionStorage.setItem("signup_flow_active", "true");
      sessionStorage.setItem("signup_timestamp", Date.now().toString());

      navigate("/verify/otp", { state: { user: userObject } });
    } catch (error) {
      console.error("Error generating OTP:", error);
      if (error.response && error.response.status === 429) {
        setSignUpError("Too many requests. Please try again later.");
        throw new Error("Too many requests. Please try again later.");
      } else {
        setSignUpError("An error occurred while generating OTP");
        throw new Error("An error occurred while generating OTP");
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  // Handle sign in with Google
  const handleSignInWithGoogle = () => {
    setIsSigningInWithGoogle(true);
    window.location.href = `${SERVER_URL}/oauth2/authorization/google`;
    setIsSigningInWithGoogle(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95 dark:bg-black">
      <Header />

      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-sm",
            "transition-all duration-500 ease-in-out transform",
            activeTab === "signin"
              ? "bg-opacity-100 scale-100"
              : "bg-opacity-98 scale-[1.01]"
          )}
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary rounded-full p-3">
                <Video className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome to NexMeet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your account or create a new one
            </p>
          </div>

          <Tabs
            defaultValue="signin"
            className="w-full"
            value={activeTab}
            onValueChange={handleTabChange}
          >
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger
                value="signin"
                className="transition-all duration-300 data-[state=active]:shadow-sm cursor-pointer"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="transition-all duration-300 data-[state=active]:shadow-sm cursor-pointer"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Sign In Form */}
            <TabsContent
              value="signin"
              className={cn(
                "mt-6 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-all",
                "data-[state=inactive]:translate-x-4 data-[state=active]:translate-x-0",
                "duration-500 ease-in-out"
              )}
            >
              <form onSubmit={handleSignIn} className="space-y-4">
                {signInError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signInError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 form-field animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      autoFocus
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 form-field animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150 fill-mode-both">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <a
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      placeholder="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground cursor-pointer"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full form-field animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300 fill-mode-both cursor-pointer"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? "Signing in..." : "Sign In"}
                </Button>

                <div className="relative flex items-center justify-center animate-in fade-in duration-700 delay-500 fill-mode-both">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative bg-card px-4 text-xs uppercase text-muted-foreground">
                    Or continue with
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full animate-in fade-in slide-in-from-bottom-3 duration-500 delay-500 fill-mode-both cursor-pointer"
                  onClick={handleSignInWithGoogle}
                  disabled={isSigningInWithGoogle}
                >
                  <svg
                    className="mr-0 h-4 w-4"
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fab"
                    data-icon="google"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 488 512"
                  >
                    <path
                      fill="currentColor"
                      d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    ></path>
                  </svg>
                  {isSigningInWithGoogle
                    ? "Connecting..."
                    : "Sign in with Google"}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Form */}
            <TabsContent
              value="signup"
              className={cn(
                "mt-6 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-all",
                "data-[state=inactive]:translate-x-4 data-[state=active]:translate-x-0",
                "duration-500 ease-in-out"
              )}
            >
              <form onSubmit={handleSignUp} className="space-y-4">
                {signUpError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signUpError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 form-field animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
                  <Label htmlFor="signup-name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      autoFocus
                      placeholder="name"
                      className="pl-10"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 form-field animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 form-field animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150 fill-mode-both">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      placeholder="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground cursor-pointer"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 form-field animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300 fill-mode-both">
                  <Label htmlFor="signup-confirm-password">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type={showSignUpConfirmPassword ? "text" : "password"}
                      className="pl-10 pr-10"
                      placeholder="re-enter password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground cursor-pointer"
                      onClick={() =>
                        setShowSignUpConfirmPassword(!showSignUpConfirmPassword)
                      }
                    >
                      {showSignUpConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full form-field animate-in fade-in slide-in-from-bottom-3 duration-500 delay-450 fill-mode-both cursor-pointer"
                  disabled={isSigningUp}
                >
                  {isSigningUp ? "Creating account..." : "Create Account"}
                </Button>

                <div className="relative flex items-center justify-center animate-in fade-in duration-700 delay-500 fill-mode-both">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative bg-card px-4 text-xs uppercase text-muted-foreground">
                    Or continue with
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full animate-in fade-in slide-in-from-bottom-3 duration-500 delay-500 fill-mode-both cursor-pointer"
                  onClick={handleSignInWithGoogle}
                  disabled={isSigningInWithGoogle}
                >
                  <svg
                    className="mr-0 h-4 w-4"
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fab"
                    data-icon="google"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 488 512"
                  >
                    <path
                      fill="currentColor"
                      d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    ></path>
                  </svg>
                  {isSigningInWithGoogle
                    ? "Connecting..."
                    : "Sign up with Google"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
