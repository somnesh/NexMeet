const express = require("express");
const router = express.Router();
const OTPService = require("../services/otpService");
const sendSignUpOTPVerificationEmail = require("../services/sendSignUpOTPVerificationEmail");
const sendForgotPasswordVerificationEmail = require("../services/sendForgotPasswordVerificationEmail");

// Initialize OTP service
const otpService = new OTPService();

// Request OTP endpoint
router.post("/request", async (req, res) => {
  try {
    const { email, name, purpose = "verification" } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Generate OTP
    const otpData = await otpService.createOTP(email, purpose);

    if (purpose === "forgotPassword") {
      await sendForgotPasswordVerificationEmail(otpData, email);
    } else {
      // Send email with OTP using your email service
      await sendSignUpOTPVerificationEmail(otpData, name.split(" ")[0], email);
    }

    res.json({
      success: true,
      message: "OTP sent successfully",
      data: {
        email,
        purpose,
        expiresAt: otpData.expiresAt,
        expiresIn: Math.floor((otpData.expiresAt - Date.now()) / 1000), // seconds
      },
    });
  } catch (error) {
    console.error("OTP request error:", error);
    res.status(429).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify OTP endpoint
router.post("/verify", async (req, res) => {
  try {
    const { email, otp, purpose = "verification" } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Email and OTP are required",
      });
    }

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(email, otp, purpose);

    res.json({
      success: true,
      message: "OTP verified successfully",
      data: verificationResult,
    });
  } catch (error) {
    // console.error("OTP verification error:", error);

    // Determine appropriate status code
    let statusCode = 400;
    if (error.message.includes("expired")) {
      statusCode = 410; // Gone
    } else if (error.message.includes("attempts exceeded")) {
      statusCode = 429; // Too Many Requests
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// Get OTP status endpoint
router.get("/status/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { purpose = "verification" } = req.query;

    const otpInfo = otpService.getOTPInfo(email, purpose);

    if (!otpInfo) {
      return res.status(404).json({
        success: false,
        error: "No active OTP found",
      });
    }

    res.json({
      success: true,
      data: otpInfo,
    });
  } catch (error) {
    console.error("OTP status error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Invalidate OTP endpoint
router.delete("/invalidate", async (req, res) => {
  try {
    const { email, purpose = "verification" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const invalidated = otpService.invalidateOTP(email, purpose);

    res.json({
      success: true,
      message: invalidated
        ? "OTP invalidated successfully"
        : "No active OTP found",
      data: { invalidated },
    });
  } catch (error) {
    console.error("OTP invalidation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Admin endpoint to get service statistics
router.get("/admin/stats", async (req, res) => {
  try {
    const stats = otpService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("OTP stats error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
