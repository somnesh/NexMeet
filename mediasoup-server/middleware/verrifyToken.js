const jwt = require("jsonwebtoken");

const JWT_SECRET = Buffer.from(process.env.PASSWORD_SECRET_KEY, "base64");

const verifyToken = (req, res, next) => {
  try {
    // Extract token from cookies (same as your Spring Boot setup)
    let token = null;
    console.log("Verifying token headers: ", req.headers);
    console.log("Verifying token cookies: ", req.headers.cookie);

    if (req.headers.cookie) {
      const cookies = req.headers.cookie;
      const tokenCookie = cookies
        .split(";")
        .find((cookie) => cookie.trim().startsWith("accessToken="));

      if (tokenCookie) {
        token = tokenCookie.trim().split("=")[1];
      }
    }

    // Fallback to Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token using the same secret as Spring Boot
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.sub, // subject contains email
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = { verifyToken };
