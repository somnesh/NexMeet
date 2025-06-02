const rateLimit = require("express-rate-limit");

// General OTP rate limiter
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: {
    success: false,
    error: "Too many OTP requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip;
  },
});

// Strict rate limiter for verification attempts
const verificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: {
    success: false,
    error:
      "Too many verification attempts from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip;
  },
});

module.exports = {
  otpRateLimiter,
  verificationRateLimiter,
};
