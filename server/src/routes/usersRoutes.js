const express = require("express");
const router = express.Router();
const {
  loginUser,
  createUser,
  listUsers,
  changeUserStatus,handleRefreshToken,
  loginHeaderUser
} = require("../controllers/usersController");
const verifyToken = require("../middlewares/verifyToken");
const verifyUnifyToken = require("../middlewares/verifyUnifyToken");
const { authorizeAdmin } = require("../middlewares/authorize");
const { accountLockoutMiddleware } = require("../middlewares/accountLockout");
const { validateLoginInput, validateRegistrationInput } = require("../middlewares/validateInput");
const { setSecureTokens, clearSecureTokens } = require("../middlewares/secureTokenStorage");

// Public
router.post("/login", validateLoginInput, accountLockoutMiddleware, loginUser, setSecureTokens);
// Handheld login. No accountLockoutMiddleware here on purpose: the handheld is a
// shared warehouse device and locking the shift's only login out for 15 minutes
// on a few fat-finger attempts is worse than the brute-force risk on an isolated
// intranet. Web /login above keeps the lockout.
router.post("/mobileLogin", validateLoginInput, loginHeaderUser);
router.post("/register", validateRegistrationInput, createUser);
router.post("/refresh", handleRefreshToken);

// Protected - Admin only
router.get("/users", verifyUnifyToken, authorizeAdmin, listUsers);
router.put("/users/:userId/status", verifyUnifyToken, authorizeAdmin, changeUserStatus);

module.exports = router;
