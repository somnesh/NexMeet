import { useState, useRef, useEffect } from "react"
import {  ArrowRight, CheckCircle, XCircle, Loader2, Eye, EyeOff, Lock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Link, useLocation, useNavigate} from "react-router-dom"
import { toast } from "sonner";
import API from "/src/api/api.js";

export default function ResetPassword() {
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })
    const [passwordVisible, setPasswordVisible] = useState({
        password: false,
        confirmPassword: false,
    })
    const [status, setStatus] = useState(null) // null, 'loading', 'success', 'error'
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [validations, setValidations] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        match: false,
    })
    const [focusedField, setFocusedField] = useState(null)
    const passwordRef = useRef(null)
    const confirmPasswordRef = useRef(null)

    const {state} = useLocation();
    const navigate = useNavigate();

    useEffect(()=>{
        console.log("state: ",state);
        if(!state.email || !state.name || !state.otp){
            navigate("/400");
        }
    },[state]);

    // Password validation
    useEffect(() => {
        const { password, confirmPassword } = formData
        setValidations({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
            match: password === confirmPassword && password !== "",
        })
    }, [formData])

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value,
        })

        // Clear error state when user starts typing
        if (status === "error") {
            setStatus(null)
            setErrorMessage("")
        }

        // Add subtle animation on typing
        e.target.classList.add("animate-pulse-subtle")
        setTimeout(() => e.target.classList.remove("animate-pulse-subtle"), 200)
    }

    // Toggle password visibility
    const togglePasswordVisibility = (field) => {
        setPasswordVisible({
            ...passwordVisible,
            [field]: !passwordVisible[field],
        })
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        const { password, confirmPassword } = formData

        // Check if all validations pass
        const allValid =
            validations.length && validations.uppercase && validations.lowercase && validations.number && validations.special

        if (!allValid) {
            setStatus("error")
            setErrorMessage("Please ensure your password meets all requirements")
            passwordRef.current?.classList.add("animate-shake")
            setTimeout(() => passwordRef.current?.classList.remove("animate-shake"), 500)
            return
        }

        if (password !== confirmPassword) {
            setStatus("error")
            setErrorMessage("Passwords do not match")
            confirmPasswordRef.current?.classList.add("animate-shake")
            setTimeout(() => confirmPasswordRef.current?.classList.remove("animate-shake"), 500)
            return
        }

        try{
            setIsLoading(true);
            setStatus("loading");

            toast.promise(handleResetPassword(password),{
                loading: "Resting password...",
                success: ()=>{
                    setIsLoading(false);
                    setStatus("success");
                    return "Password reset successful.";
                },
                error: (error) => {
                    return (
                        error.response?.data ||
                        "An error occurred while resting password."
                    );
                },
            })
        }catch (error) {
            setIsLoading(false);
            setStatus("error");
            setErrorMessage(error.response?.data);
        }
    }

    const handleResetPassword = async (password) => {
        try{
            const res = await API.post("/auth/reset-password", {email: state.email, password: password}, {withCredentials: true});
            console.log("reset password: ", res.data);

        }catch(error){
            console.error(error);
            setStatus("error");
            setErrorMessage(error.response.data || "Failed to reset password")
        }
    }

    // Handle input focus
    const handleFocus = (field) => {
        setFocusedField(field)
    }

    // Handle input blur
    const handleBlur = () => {
        setFocusedField(null)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 transition-all duration-500 ease-in-out">
            <div className="w-full max-w-md transform rounded-xl border bg-card p-6 shadow-lg transition-all duration-500 ease-in-out hover:shadow-xl animate-slide-up">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold transition-all duration-300 hover:scale-105">
                        {status === "success" ? "Password Updated" : "Create New Password"}
                    </h1>
                </div>

                {status !== "success" ? (
                    <>
                        <p className="mb-6 text-muted-foreground transition-all duration-300 animate-fade-in-delayed">
                            Create a strong password for your account. Your password must include:
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium transition-all duration-300">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-300" />
                                    <Input
                                        ref={passwordRef}
                                        id="password"
                                        name="password"
                                        type={passwordVisible.password ? "text" : "password"}
                                        placeholder="Enter new password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onFocus={() => handleFocus("password")}
                                        onBlur={handleBlur}
                                        className={`pl-10 pr-10 transition-all duration-300 ease-in-out transform ${
                                            status === "error" && !validations.match
                                                ? "border-red-500 bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-red-500/20"
                                                : "focus:border-primary focus:ring-primary/20"
                                        } ${focusedField === "password" ? "ring-2 ring-primary/30" : ""}`}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility("password")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 hover:text-foreground cursor-pointer"
                                    >
                                        {passwordVisible.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium transition-all duration-300">
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-300" />
                                    <Input
                                        ref={confirmPasswordRef}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={passwordVisible.confirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        onFocus={() => handleFocus("confirmPassword")}
                                        onBlur={handleBlur}
                                        className={`pl-10 pr-10 transition-all duration-300 ease-in-out transform ${
                                            status === "error" && !validations.match
                                                ? "border-red-500 bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-red-500/20"
                                                : "focus:border-primary focus:ring-primary/20"
                                        } ${focusedField === "confirmPassword" ? "ring-2 ring-primary/30" : ""}`}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility("confirmPassword")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 hover:text-foreground cursor-pointer"
                                    >
                                        {passwordVisible.confirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password requirements */}
                            <div className="rounded-md bg-secondary/50 p-4 space-y-2 animate-fade-in-delayed">
                                <h3 className="text-sm font-medium">Password Requirements:</h3>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <li
                                        className={`flex items-center transition-all duration-300 ${
                                            validations.length ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                        }`}
                                    >
                                        <div
                                            className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                                                validations.length
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "border border-muted-foreground"
                                            }`}
                                        >
                                            {validations.length && <Check className="h-3 w-3" />}
                                        </div>
                                        At least 8 characters
                                    </li>
                                    <li
                                        className={`flex items-center transition-all duration-300 ${
                                            validations.uppercase ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                        }`}
                                    >
                                        <div
                                            className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                                                validations.uppercase
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "border border-muted-foreground"
                                            }`}
                                        >
                                            {validations.uppercase && <Check className="h-3 w-3" />}
                                        </div>
                                        One uppercase letter
                                    </li>
                                    <li
                                        className={`flex items-center transition-all duration-300 ${
                                            validations.lowercase ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                        }`}
                                    >
                                        <div
                                            className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                                                validations.lowercase
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "border border-muted-foreground"
                                            }`}
                                        >
                                            {validations.lowercase && <Check className="h-3 w-3" />}
                                        </div>
                                        One lowercase letter
                                    </li>
                                    <li
                                        className={`flex items-center transition-all duration-300 ${
                                            validations.number ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                        }`}
                                    >
                                        <div
                                            className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                                                validations.number
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "border border-muted-foreground"
                                            }`}
                                        >
                                            {validations.number && <Check className="h-3 w-3" />}
                                        </div>
                                        One number
                                    </li>
                                    <li
                                        className={`flex items-center transition-all duration-300 ${
                                            validations.special ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                        }`}
                                    >
                                        <div
                                            className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                                                validations.special
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "border border-muted-foreground"
                                            }`}
                                        >
                                            {validations.special && <Check className="h-3 w-3" />}
                                        </div>
                                        One special character
                                    </li>
                                    <li
                                        className={`flex items-center transition-all duration-300 ${
                                            validations.match ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                        }`}
                                    >
                                        <div
                                            className={`mr-2 h-4 w-4 rounded-full flex items-center justify-center ${
                                                validations.match
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                    : "border border-muted-foreground"
                                            }`}
                                        >
                                            {validations.match && <Check className="h-3 w-3" />}
                                        </div>
                                        Passwords match
                                    </li>
                                </ul>
                            </div>

                            {status === "error" && (
                                <div className="flex items-center rounded-md bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-slide-down">
                                    <XCircle className="mr-2 h-4 w-4 animate-shake" />
                                    <span className="text-sm animate-fade-in">{errorMessage}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full transition-all duration-300 active:scale-95 transform cursor-pointer"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating Password...
                                    </>
                                ) : (
                                    <>
                                        Update Password
                                    </>
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

                        <h2 className="text-xl font-semibold mb-4 animate-fade-in-delayed">Password Updated Successfully!</h2>

                        <p className="mb-6 text-muted-foreground animate-fade-in-delayed-2">
                            Your password has been changed successfully. You can now log in with your new password.
                        </p>

                        <div className="mt-6">
                            <Link to={"/login"} className="w-full">
                                <Button className="w-full transition-all duration-300 active:scale-95 transform animate-fade-in-delayed-3 cursor-pointer">
                                    Go to Login
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {status !== "success" && (
                    <div className="mt-6 text-center">
                        <Link
                            to={"/login"}
                            className="inline-flex items-center text-sm text-muted-foreground transition-all duration-300 hover:text-primary"
                        >
                            Remember your password? Log in
                        </Link>
                    </div>
                )}
            </div>

            {/* Security tip */}
            {status !== "success" && (
                <div className="mt-6 w-full max-w-md text-center animate-fade-in-delayed-3">
                    <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Security Tip:</span> Never reuse passwords across multiple sites. Consider
                        using a password manager.
                    </p>
                </div>
            )}
        </div>
    )
}
