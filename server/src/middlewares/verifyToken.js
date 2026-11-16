const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  const secretKey = process.env.ACCESS_TOKEN_SECRET;

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

    req.user = decoded;
    console.log('Token verified successfully for user:', decoded.userId || decoded.id);
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: "Access token has expired",
        error: "expired_token"
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: "Invalid token format",
        error: "invalid_token"
      });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        message: "Token not yet valid",
        error: "token_not_valid_yet"
      });
    } else {
      return res.status(401).json({
        message: "Token verification failed",
        error: "token_verification_failed"
      });
    }
  }
};

module.exports = verifyToken;