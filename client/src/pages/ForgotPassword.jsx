import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Mail,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { CustomOtpInput } from "../components/CustomOtpInput";
import { toast } from "sonner";
import axios from "axios";
import API from "/src/api/api.js";

const pageStyles = `
  

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @keyframes bounce-once {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
    20%, 40%, 60%, 80% { transform: translateX(3px); }
  }

  @keyframes shake-subtle {
    0%, 100% { transform: translateX(0); }
    25%, 75% { transform: translateX(-1px); }
    50% { transform: translateX(1px); }
  }

  @keyframes pulse-once {
    0% { transform: scale(1); background-color: rgb(var(--primary) / 0.1); }
    50% { transform: scale(1.05); background-color: rgb(var(--primary) / 0.2); }
    100% { transform: scale(1); background-color: transparent; }
  }

  .animate-slide-up { animation: slide-up 0.5s ease-out; }
  .animate-slide-down { animation: slide-down 0.3s ease-out; }
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
  .animate-fade-in-delayed { animation: fade-in 0.5s ease-out 0.2s both; }
  .animate-fade-out { animation: fade-out 0.2s ease-out; }
  .animate-bounce-subtle { animation: bounce-subtle 0.3s ease-out; }
  .animate-bounce-once { animation: bounce-once 0.5s ease-out; }
  .animate-shake { animation: shake 0.5s ease-in-out; }
  .animate-shake-subtle { animation: shake-subtle 0.3s ease-in-out; }
  .animate-pulse-once { animation: pulse-once 0.4s ease-out; }
`;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null, 'loading', 'success', 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const emailInputRef = useRef(null);
  const navigate = useNavigate();

  const MEDIA_SERVER_URL = import.meta.env.VITE_MEDIA_SERVER_URL;

  // Add the styles to the page when component mounts
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = pageStyles;
    document.head.appendChild(styleElement);

    // Cleanup: remove styles when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email input change
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    // Clear error state when user starts typing
    if (status === "error") {
      setStatus(null);
      setErrorMessage("");
    }

    // Add subtle animation on typing
    e.target.classList.add("animate-pulse-subtle");
    setTimeout(() => e.target.classList.remove("animate-pulse-subtle"), 200);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus("error");
      setErrorMessage("Please enter your email address");
      emailInputRef.current?.classList.add("animate-shake");
      setTimeout(
        () => emailInputRef.current?.classList.remove("animate-shake"),
        500
      );
      return;
    }

    if (!validateEmail(email)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address");
      emailInputRef.current?.classList.add("animate-shake");
      setTimeout(
        () => emailInputRef.current?.classList.remove("animate-shake"),
        500
      );
      return;
    }

    setIsLoading(true);
    setStatus("loading");

    try {
      const emailVerified = await verifyEmail(email);

      if (emailVerified) {
        toast.promise(generateOTP("userUnknown"), {
          loading: "Generating OTP...",
          success: () => {
            setStatus("success");
            return "OTP sent successfully! Please check your email.";
          },
          error: (error) => {
            return (
                error.response?.data?.msg ||
                "An error occurred while generating OTP"
            );
          },
        });
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      setIsLoading(false);
      setStatus("error");
      setErrorMessage(error.response?.data || "Failed to send verification email. Please try again.");
      emailInputRef.current?.classList.add("animate-shake");
      setTimeout(
        () => emailInputRef.current?.classList.remove("animate-shake"),
        500
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email) => {
    try{
      const req = toast.promise(API.get(`/auth/email/${email}`,{withCredentials: true}),{
        loading: "Verifying email address...",
        success: () => {
          return "Verification successful!"
        },
        error: (error) => {
          console.log("Verification email failed with error:", error);
          setStatus("error");
          setErrorMessage(error.response?.data);
          return (
              error.response?.data ||
              "An error occurred while verifying your email address"
          )
        }
      });

      const res = await req.unwrap();
      if (res.status === 200) {
        return true;
      }
    }catch(error) {
      console.error(error);
      throw error;
    }
  }

  const generateOTP = async (name) => {
    try {
      await axios.post(`${MEDIA_SERVER_URL}/api/otp/request`, {
        email,
        name,
        purpose: "forgotPassword",
      });
    } catch (error) {
      console.error("Error generating OTP:", error);
      if (error.response && error.response.status === 429) {
        console.error("Too many requests. Please try again later.");
        setErrorMessage("Too many requests. Please try again later.");
        throw new Error("Too many requests. Please try again later.");
      } else {
        console.error("An error occurred while generating OTP:", error);
        setErrorMessage("An error occurred while generating OTP");
        throw new Error("An error occurred while generating OTP");
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 transition-all duration-500 ease-in-out">
      <div className="w-full max-w-md transform rounded-xl border bg-card p-6 shadow-lg transition-all duration-500 ease-in-out hover:shadow-xl animate-slide-up">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold transition-all duration-300 hover:scale-105">
            {status === "success" ? "Check Your Email" : "Forgot Password"}
          </h1>
        </div>

        {status !== "success" ? (
          <>
            <p className="mb-6 text-muted-foreground transition-all duration-300 animate-fade-in-delayed">
              Enter your email address and we'll send you a verification code to
              reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium transition-all duration-300"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-300" />
                  <Input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={handleEmailChange}
                    className={`pl-10 transition-all duration-300 ease-in-out transform ${
                      status === "error"
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-red-500/20"
                        : "focus:border-primary focus:ring-primary/20"
                    }`}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {status === "error" && (
                <div className="flex items-center rounded-md bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-slide-down">
                  <XCircle className="mr-2 h-4 w-4" />
                  <span className="text-sm animate-fade-in">
                    {errorMessage}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full transition-all duration-300 active:scale-95 transform cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>Send Verification Code</>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center animate-fade-in">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30 animate-bounce-once">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <p className="mb-4 text-muted-foreground animate-fade-in-delayed">
              We've sent a 6-digit verification code to
            </p>

            <p className="mb-6 font-semibold text-primary animate-fade-in-delayed-2">
              {email}
            </p>

            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20 animate-slide-down">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Please check your email and enter the verification code to reset
                your password.
              </p>
            </div>

            <CustomOtpInput email={email} name={"userUnknown"} />
          </div>
        )}

        <div className="mt-1 text-center">
          <Button
            onClick={() => navigate("/login", { replace: true })}
            variant="link"
            className="inline-flex items-center text-sm text-muted-foreground transition-all duration-300 hover:text-primary cursor-pointer group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to Login
          </Button>
        </div>
      </div>

      {/* Additional help section */}
      <div className="mt-6 w-full max-w-md text-center animate-fade-in-delayed-3">
        <p className="text-xs text-muted-foreground">
          Didn't receive the email? Check your spam folder
        </p>
      </div>
    </div>
  );
}
