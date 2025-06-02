import { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

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

export default function OTPVerification() {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [verificationStatus, setVerificationStatus] = useState(null); // null, 'success', 'error', 'loading'
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [resendCodeLoading, setResendCodeLoading] = useState(false);
  const inputRefs = useRef([]);
  const { state } = useLocation();

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
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

  // Enhanced route protection
  useEffect(() => {
    const signupFlowActive = sessionStorage.getItem("signup_flow_active");
    const signupTimestamp = sessionStorage.getItem("signup_timestamp");
    const currentTime = Date.now();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    // Check if signup flow is active and not expired
    const isValidFlow =
      signupFlowActive === "true" &&
      signupTimestamp &&
      currentTime - parseInt(signupTimestamp) < fifteenMinutes;

    if (
      !state ||
      !state.user ||
      !state.user.email ||
      !state.user.name ||
      !isValidFlow
    ) {
      // Clear invalid session data
      sessionStorage.removeItem("signup_flow_active");
      sessionStorage.removeItem("signup_timestamp");

      navigate("/400", { replace: true });
      return;
    }
  }, [state, navigate]);

  // Clear session data when component unmounts or verification succeeds
  useEffect(() => {
    return () => {
      if (verificationStatus === "success") {
        sessionStorage.removeItem("signup_flow_active");
        sessionStorage.removeItem("signup_timestamp");
      }
    };
  }, [verificationStatus]);

  // Handle input change with animation
  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    // Add bounce animation to the input
    element.classList.add("animate-bounce-subtle");
    setTimeout(() => element.classList.remove("animate-bounce-subtle"), 200);

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input with delay for smooth transition
    if (element.value && index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1].focus();
        setFocusedIndex(index + 1);
      }, 100);
    }
  };

  // Handle backspace with animation
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        setTimeout(() => {
          inputRefs.current[index - 1].focus();
          setFocusedIndex(index - 1);
        }, 50);
      }
      // Add subtle shake animation for backspace
      e.target.classList.add("animate-shake-subtle");
      setTimeout(() => e.target.classList.remove("animate-shake-subtle"), 300);
    }
  };

  // Handle paste with staggered animation
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 6).split("");

    if (pasteData) {
      const newOtp = [...otp];
      pasteData.forEach((value, index) => {
        if (index < 6 && !isNaN(value)) {
          newOtp[index] = value;
          // Staggered animation for pasted values
          setTimeout(() => {
            if (inputRefs.current[index]) {
              inputRefs.current[index].value = value;
              inputRefs.current[index].classList.add("animate-pulse-once");
              setTimeout(() => {
                inputRefs.current[index]?.classList.remove(
                  "animate-pulse-once"
                );
              }, 400);
            }
          }, index * 50);
        }
      });
      setOtp(newOtp);

      // Focus on the next empty input or the last one
      const lastFilledIndex = newOtp.findIndex((val) => val === "") - 1;
      const focusIndex = lastFilledIndex >= 0 ? lastFilledIndex : 5;
      setTimeout(() => {
        const targetIndex = focusIndex < 5 ? focusIndex + 1 : 5;
        inputRefs.current[targetIndex].focus();
        setFocusedIndex(targetIndex);
      }, pasteData.length * 50 + 100);
    }
  };

  // Handle input focus
  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  // Verify OTP with loading animation
  const verifyOtp = async () => {
    const enteredOtp = otp.join("");
    setErrorMessage("");
    setVerificationStatus(null);

    if (enteredOtp.length !== 6) {
      setVerificationStatus("error");
      // Shake all inputs for incomplete OTP
      inputRefs.current.forEach((input, index) => {
        setTimeout(() => {
          input?.classList.add("animate-shake");
          setTimeout(() => input?.classList.remove("animate-shake"), 500);
        }, index * 50);
      });
      return;
    }

    setIsLoading(true);
    setVerificationStatus("loading");

    try {
      console.log("Entered OTP: ", enteredOtp);
      console.log("User email: ", state?.user?.email);

      const response = await axios.post(`${MEDIA_SERVER_URL}/api/otp/verify`, {
        email: state?.user?.email,
        otp: enteredOtp,
        purpose: "signup",
      });

      console.log("OTP verification response:", response.data);
      setIsLoading(false);
      if (response.data.success) {
        setVerificationStatus("success");
        toast.promise(
          signUpAPI(
            state?.user?.name,
            state?.user?.email,
            state?.user?.password
          ),
          {
            loading: "Signing up...",
            success: "Account created successfully!",
            error: (error) => {
              return (
                error.response?.data?.msg ||
                "An error occurred during sign up. Please try again."
              );
            },
          }
        );
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setVerificationStatus("error");
      setErrorMessage(
        error.response?.data?.error || "Verification failed. Please try again."
      );
      setIsLoading(false);
      // Shake inputs on error
      inputRefs.current.forEach((input, index) => {
        setTimeout(() => {
          input?.classList.add("animate-shake");
          setTimeout(() => input?.classList.remove("animate-shake"), 500);
        }, index * 30);
      });
    }
  };

  // Reset the form with animation
  const resetForm = () => {
    setErrorMessage("");
    const inputs = inputRefs.current;
    // Animate clearing inputs
    inputs.reverse().forEach((input, index) => {
      setTimeout(() => {
        input.classList.add("animate-fade-out");
        setTimeout(() => {
          input.value = "";
          input.classList.remove("animate-fade-out");
          input.classList.add("animate-fade-in");
          setTimeout(() => input.classList.remove("animate-fade-in"), 200);
        }, 100);
      }, index * 50);
    });

    setTimeout(() => {
      setOtp(new Array(6).fill(""));
      setVerificationStatus(null);
      setFocusedIndex(0);
      inputRefs.current[5].focus();
    }, 300);
  };

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
      setFocusedIndex(0);
    }, 100);
  }, []);

  const signUpAPI = async (name, email, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        {
          name,
          email,
          password,
        },
        { withCredentials: true }
      );

      console.log(response.data);
      localStorage.setItem("avatar", response.data.avatar);
      localStorage.setItem("id", response.data.id);
      localStorage.setItem("name", response.data.name);
      localStorage.setItem("email", response.data.email);
      if (response.status === 201) {
        navigate("/");
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.error("Email already exists: ", error);
        setSignUpError("Email already exists");
        throw new Error("Email already exists");
      } else {
        console.error("Error during sign up:", error);
        setSignUpError("An error occurred while signing up");
        throw new Error("An error occurred while signing up");
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const generateOTP = async () => {
    setResendCodeLoading(true);
    const name = state?.user?.name;
    const email = state?.user?.email;
    const password = state?.user?.password;
    try {
      await axios.post(`${MEDIA_SERVER_URL}/api/otp/request`, {
        email,
        name,
        purpose: "signup",
      });
    } catch (error) {
      console.error("Error generating OTP:", error);
      if (error.response && error.response.status === 429) {
        setErrorMessage("Too many requests. Please try again later.");
        throw new Error("Too many requests. Please try again later.");
      } else {
        setErrorMessage("An error occurred while generating OTP");
        throw new Error("An error occurred while generating OTP");
      }
    } finally {
      setResendCodeLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 transition-all duration-500 ease-in-out">
      <div className="w-full max-w-md transform rounded-xl border bg-card p-6 shadow-lg transition-all duration-500 ease-in-out hover:shadow-xl animate-slide-up">
        <div className="mb-6 flex flex-col gap-5">
          <Button
            variant="ghost"
            className="transition-all duration-300 active:scale-95 transform cursor-pointer w-fit border-gray-700 border-[1px]"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
          <h1 className="text-2xl font-bold transition-all duration-300">
            Verification Code
          </h1>
        </div>

        <p className="mb-6 text-muted-foreground transition-all duration-300 animate-fade-in-delayed">
          We've sent a 6-digit verification code to your email address. Enter
          the code below to confirm your identity.
        </p>

        <div className="mb-6">
          <div className="flex justify-center space-x-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                ref={(input) => (inputRefs.current[index] = input)}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={() => handleFocus(index)}
                onPaste={handlePaste}
                maxLength={1}
                className={`h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold shadow-sm transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-110 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  focusedIndex === index
                    ? "ring-2 ring-primary/30 scale-105"
                    : ""
                } ${
                  verificationStatus === "error"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : ""
                } ${
                  verificationStatus === "success"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : ""
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
        {errorMessage && (
          <div className="mb-6 flex items-center rounded-md text-sm bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-slide-down">
            <XCircle className="mr-2 mt-[1px] h-4 w-4" />
            <span className="animate-fade-in">{errorMessage}</span>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="mb-6 flex items-center rounded-md text-sm bg-green-100 p-3 text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-slide-down">
            <CheckCircle className="mr-2 h-4 w-4 animate-bounce-once" />
            <span className="animate-fade-in">Verification successful!</span>
          </div>
        )}

        {verificationStatus === "error" && !errorMessage && (
          <div className="mb-6 flex items-center rounded-md text-sm bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-slide-down">
            <XCircle className="mr-2 mt-[1px] h-4 w-4" />
            <span className="animate-fade-in">
              Invalid verification code. Please try again.
            </span>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <Button
            onClick={verifyOtp}
            className="w-full transition-all duration-300 active:scale-95 transform cursor-pointer"
            disabled={
              otp.join("").length !== 6 ||
              isLoading ||
              verificationStatus === "success"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>Verify Code</>
            )}
          </Button>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={resetForm}
              className="transition-all duration-300 hover:scale-105 active:scale-95 transform cursor-pointer"
            >
              Reset
            </Button>
            <Button
              variant="link"
              className="transition-all duration-300 hover:scale-105 active:scale-95 transform cursor-pointer"
              onClick={() => {
                toast.promise(generateOTP(), {
                  loading: "Resending code...",
                  success: "Code resent successfully!",
                  error: (error) => {
                    return (
                      error.response?.data?.error ||
                      "An error occurred while resending the code."
                    );
                  },
                });
              }}
              disabled={
                isLoading ||
                verificationStatus === "success" ||
                resendCodeLoading
              }
            >
              {resendCodeLoading ? "Resending..." : "Resend Code"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
