const con = require("../config/databaseCon");
const { logger } = require("../utils/logger");

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const checkAccountLockout = async (email) => {
  try {
    const query = `
      SELECT failed_attempts, lockout_until
      FROM users
      WHERE email = $1
    `;
    const result = await con.query(query, [email]);

    if (result.rows.length === 0) return { locked: false };

    const user = result.rows[0];
    const now = new Date();

    // Check if account is currently locked
    if (user.lockout_until && user.lockout_until > now) {
      const remainingTime = Math.ceil((user.lockout_until - now) / (60 * 1000));
      return {
        locked: true,
        message: `Account locked. Try again in ${remainingTime} minutes.`,
        remainingTime
      };
    }

    return { locked: false, attempts: user.failed_attempts || 0 };
  } catch (error) {
    logger.error("Account lockout check error:", error);
    return { locked: false };
  }
};

const incrementFailedAttempts = async (email) => {
  try {
    const now = new Date();
    const lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION);

    const query = `
      UPDATE users
      SET
        failed_attempts = failed_attempts + 1,
        lockout_until = CASE
          WHEN (failed_attempts + 1) >= $1 THEN $2
          ELSE NULL
        END
      WHERE email = $3
      RETURNING failed_attempts, lockout_until
    `;

    const result = await con.query(query, [MAX_FAILED_ATTEMPTS, lockoutUntil, email]);
    return result.rows[0];
  } catch (error) {
    logger.error("Failed to increment attempts:", error);
    throw error;
  }
};

const resetFailedAttempts = async (email) => {
  try {
    const query = `
      UPDATE users
      SET failed_attempts = 0, lockout_until = NULL
      WHERE email = $1
    `;
    await con.query(query, [email]);
  } catch (error) {
    logger.error("Failed to reset attempts:", error);
    throw error;
  }
};

const accountLockoutMiddleware = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next();
    }

    const { locked, message } = await checkAccountLockout(email);

    if (locked) {
      return res.status(403).json({
        message: message || "Account temporarily locked due to too many failed attempts"
      });
    }

    next();
  } catch (error) {
    logger.error("Account lockout middleware error:", error);
    next();
  }
};

module.exports = {
  checkAccountLockout,
  incrementFailedAttempts,
  resetFailedAttempts,
  accountLockoutMiddleware
};
