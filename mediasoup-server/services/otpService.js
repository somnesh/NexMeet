const crypto = require("crypto");

class OTPService {
  constructor() {
    // In-memory storage for OTPs
    this.otpStore = new Map();

    // Configuration
    this.config = {
      otpLength: 6,
      expirationTime: 10 * 60 * 1000, // 10 minutes in milliseconds
      maxAttempts: 3,
      rateLimitWindow: 60 * 1000, // 1 minute
      maxRequestsPerWindow: 3,
    };

    // Rate limiting storage
    this.rateLimitStore = new Map();

    // Cleanup expired OTPs every minute
    setInterval(() => this.cleanupExpiredOTPs(), 60 * 1000);
  }

  // Generate a secure random OTP
  generateOTP() {
    const min = Math.pow(10, this.config.otpLength - 1);
    const max = Math.pow(10, this.config.otpLength) - 1;
    return crypto.randomInt(min, max).toString();
  }

  // Create and store OTP for email
  async createOTP(email, purpose = "verification") {
    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limiting
    if (!this.checkRateLimit(normalizedEmail)) {
      throw new Error("Too many OTP requests. Please try again later.");
    }

    // Generate OTP
    const otp = this.generateOTP();
    const now = Date.now();
    const expiresAt = now + this.config.expirationTime;

    // Store OTP data
    const otpData = {
      otp,
      email: normalizedEmail,
      purpose,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verified: false,
      used: false,
    };

    // Use email + purpose as key to allow multiple OTPs per email for different purposes
    const key = `${normalizedEmail}:${purpose}`;
    this.otpStore.set(key, otpData);

    console.log(`OTP generated for ${normalizedEmail} (${purpose}): ${otp}`);

    return {
      otp,
      expiresAt,
      purpose,
    };
  }

  // Verify OTP
  async verifyOTP(email, otp, purpose = "verification") {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${normalizedEmail}:${purpose}`;

    const otpData = this.otpStore.get(key);

    if (!otpData) {
      throw new Error("OTP not found or expired");
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(key);
      throw new Error("OTP has expired");
    }

    // Check if OTP was already used
    if (otpData.used) {
      throw new Error("OTP has already been used");
    }

    // Check max attempts
    if (otpData.attempts >= this.config.maxAttempts) {
      this.otpStore.delete(key);
      throw new Error("Maximum verification attempts exceeded");
    }

    // Increment attempts
    otpData.attempts++;

    // Verify OTP
    if (otpData.otp !== otp.toString()) {
      throw new Error("Invalid OTP");
    }

    // Mark as verified and used
    otpData.verified = true;
    otpData.used = true;
    otpData.verifiedAt = Date.now();

    console.log(
      `OTP verified successfully for ${normalizedEmail} (${purpose})`
    );

    // Remove from store after successful verification
    this.otpStore.delete(key);

    return {
      verified: true,
      email: normalizedEmail,
      purpose,
      verifiedAt: otpData.verifiedAt,
    };
  }

  // Check rate limiting
  checkRateLimit(email) {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;

    if (!this.rateLimitStore.has(email)) {
      this.rateLimitStore.set(email, []);
    }

    const requests = this.rateLimitStore.get(email);

    // Remove old requests outside the window
    const recentRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );
    this.rateLimitStore.set(email, recentRequests);

    // Check if limit exceeded
    if (recentRequests.length >= this.config.maxRequestsPerWindow) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    return true;
  }

  // Get OTP info (without revealing the actual OTP)
  getOTPInfo(email, purpose = "verification") {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${normalizedEmail}:${purpose}`;
    const otpData = this.otpStore.get(key);

    if (!otpData) {
      return null;
    }

    return {
      email: otpData.email,
      purpose: otpData.purpose,
      createdAt: otpData.createdAt,
      expiresAt: otpData.expiresAt,
      attempts: otpData.attempts,
      maxAttempts: this.config.maxAttempts,
      verified: otpData.verified,
      used: otpData.used,
      timeRemaining: Math.max(0, otpData.expiresAt - Date.now()),
    };
  }

  // Invalidate OTP
  invalidateOTP(email, purpose = "verification") {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${normalizedEmail}:${purpose}`;

    const deleted = this.otpStore.delete(key);
    if (deleted) {
      console.log(`OTP invalidated for ${normalizedEmail} (${purpose})`);
    }

    return deleted;
  }

  // Cleanup expired OTPs
  cleanupExpiredOTPs() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(key);
        cleanedCount++;
      }
    }

    // Cleanup old rate limit entries
    for (const [email, requests] of this.rateLimitStore.entries()) {
      const windowStart = now - this.config.rateLimitWindow;
      const recentRequests = requests.filter(
        (timestamp) => timestamp > windowStart
      );

      if (recentRequests.length === 0) {
        this.rateLimitStore.delete(email);
      } else {
        this.rateLimitStore.set(email, recentRequests);
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired OTPs`);
    }
  }

  // Get service statistics
  getStats() {
    const now = Date.now();
    let activeOTPs = 0;
    let expiredOTPs = 0;

    for (const otpData of this.otpStore.values()) {
      if (now <= otpData.expiresAt) {
        activeOTPs++;
      } else {
        expiredOTPs++;
      }
    }

    return {
      activeOTPs,
      expiredOTPs,
      totalStored: this.otpStore.size,
      rateLimitedEmails: this.rateLimitStore.size,
      config: this.config,
    };
  }
}

module.exports = OTPService;
