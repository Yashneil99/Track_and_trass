const {
  authLogin,
  registerUser,
  getAllUsers,
  updateUserStatus,
  refreshAccessToken,
  authHeaderLogin,
} = require("../dataLayer/usersDL");
const { resetFailedAttempts } = require("../middlewares/accountLockout");
const { logger } = require("../utils/logger");

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const result = await authLogin(email, password);
    if (result.status === 200) {
      await resetFailedAttempts(email);
      res.locals.userData = result;
    } else {
      return res.status(result.status).json(result);
    }

    if (res.locals.userData) {
      next();
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginHeaderUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(email);

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const result = await authHeaderLogin(email, password);
    if (result.status === 200) {
      await resetFailedAttempts(email);
      res.locals.userData = result;
    } else {
      return res.status(result.status).json(result);
    }
    if (res.locals.userData) {
      return res.status(result.status).json(result);
    }
  } catch (error) {
    console.error("LoginHeader Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    // Password policy validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain at least 8 characters, including uppercase, lowercase, number and special character",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const result = await registerUser(name, email, password, "USER");
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const listUsers = async (req, res) => {
  try {
    const result = await getAllUsers();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!userId || !status)
      return res.status(400).json({ message: "User ID and status required" });

    const result = await updateUserStatus(userId, status);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const handleRefreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie instead of body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const result = await refreshAccessToken(refreshToken);

    if (result.status === 200) {
      // Set new access token in cookie
      const useSecure = process.env.COOKIE_SECURE === "true";
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: useSecure,
        sameSite: useSecure ? "none" : "lax",
        maxAge: 6 * 60 * 60 * 1000, // 6 hours
      });

      return res.status(result.status).json({
        message: "Token refreshed successfully",
        accessTokenExpiry: Date.now() + 6 * 60 * 60 * 1000,
      });
    } else {
      return res.status(result.status).json(result);
    }
  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  loginUser,
  createUser,
  listUsers,
  changeUserStatus,
  handleRefreshToken,
  loginHeaderUser,
};
