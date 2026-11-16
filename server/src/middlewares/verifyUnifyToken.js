const jwt = require("jsonwebtoken");

const verifyUnifiedToken = (req, res, next) => {
  const secretKey = process.env.ACCESS_TOKEN_SECRET;
  let token = null;

  // 1. Try extracting token from Cookies (Web App)
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
    console.log("Authenticating via Web Cookie...");
  } 
  // 2. Fallback: Try extracting token from Authorization Header (Mobile App)
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("Authenticating via Mobile Header...");
  }

  // If no token is found in either location, reject
  if (!token) {
    return res.status(401).json({
      message: "Access token missing or invalid",
      error: "missing_token"
    });
  }

  if (!secretKey) {
    console.error('JWT Secret Key is missing from environment variables');
    return res.status(500).json({
      message: "Server configuration error",
      error: "missing_server_config"
    });
  }

  try {
    // 3. Execute your exact same validation logic on the recovered token
    const decoded = jwt.verify(token, secretKey);

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        message: "Access token has expired",
        error: "expired_token"
      });
    }

    if (!decoded.userId && !decoded.id) {
      return res.status(401).json({
        message: "Invalid token structure",
        error: "invalid_token_structure"
      });
    }

    // Attach decoded user payload to request for downstream controllers
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Access token has expired", error: "expired_token" });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token format", error: "invalid_token" });
    } else {
      return res.status(401).json({ message: "Token verification failed", error: "token_verification_failed" });
    }
  }
};

module.exports = verifyUnifiedToken;