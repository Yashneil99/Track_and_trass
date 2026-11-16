const con = require("../config/databaseCon");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logger } = require("../utils/logger");

const generateTokens = (user) => {
  // Debug: Check if environment variables are loaded
  console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET);
  console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET);

  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    console.error('JWT secrets are not loaded!');
    throw new Error('JWT secrets are not configured properly');
  }

  const accessToken = jwt.sign(
    { userId: user.user_id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "6h" }
  );

  const refreshToken = jwt.sign(
    { userId: user.user_id, email: user.email, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const authLogin = async (email, password) => {
  try {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await con.query(query, [email]); 

    if (result.rows.length === 0)
      return { status: 401, message: "Invalid credentials" };

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Increment failed attempts
      const { incrementFailedAttempts } = require("../middlewares/accountLockout");
      await incrementFailedAttempts(email);
      return { status: 401, message: "Invalid credentials" };
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const accessPayload = jwt.decode(accessToken);
    const refreshPayload = jwt.decode(refreshToken);

    const accessTokenExpiry = accessPayload?.exp
      ? accessPayload.exp * 1000
      : null;

    const refreshTokenExpiry = refreshPayload?.exp
      ? refreshPayload.exp * 1000
      : null;

    await con.query(`UPDATE users SET refresh_token = $1 WHERE user_id = $2`, [
      refreshToken,
      user.user_id,
    ]);

    return {
      status: 200,
      message: "Login successful",
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
      userId: user.user_id,
      userName: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error("Error Executing Login:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const authHeaderLogin = async (email, password) => {
  try {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await con.query(query, [email]);

    if (result.rows.length === 0) {
      return { status: 403, message: "User not authorized or provisioned in this system" };
    }

    const user = result.rows[0];
    if (user.status === 'inactive' || user.status === 'suspended') {
      return { status: 403, message: "User account is inactive" };
    }

    // Verify the password. Without this the endpoint let anyone in with any
    // password for a known email — the handheld login was a rubber stamp.
    const passwordMatch = await bcrypt.compare(password || "", user.password);
    if (!passwordMatch) {
      return { status: 401, message: "Invalid credentials" };
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const accessPayload = jwt.decode(accessToken);
    const refreshPayload = jwt.decode(refreshToken);
    const accessTokenExpiry = accessPayload?.exp ? accessPayload.exp * 1000 : null;
    const refreshTokenExpiry = refreshPayload?.exp ? refreshPayload.exp * 1000 : null;

    await con.query(`UPDATE users SET refresh_token = $1 WHERE user_id = $2`, [
      refreshToken,
      user.user_id,
    ]);

    return {
      status: 200,
      message: "Login successful",
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
      userId: user.user_id,
      userName: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error("Error Executing Header Login:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const registerUser = async (name, email, password, role) => {
  try {
    const checkQuery = `SELECT * FROM users WHERE email = $1`;
    const check = await con.query(checkQuery, [email]);

    if (check.rows.length > 0)
      return { status: 400, message: "Email already registered" };

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, name, email, role
    `;
    const result = await con.query(insertQuery, [
      name,
      email,
      hashedPassword,
      role,
    ]);

    return {
      status: 201,
      message: "User registered successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error Registering User:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const refreshAccessToken = async (refreshToken) => {
  try {
    if (!refreshToken)
      return { status: 400, message: "Refresh token required" };

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log(decoded);
    
    const query = `SELECT * FROM users WHERE user_id = $1 AND refresh_token = $2`;
    const result = await con.query(query, [decoded.userId, refreshToken]);
    console.log(result.rows);
    

    if (result.rows.length === 0)
      return { status: 403, message: "Invalid refresh token" };

    const user = result.rows[0];
    const accessToken = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "6h" }
    );

    return { status: 200, accessToken };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return { status: 403, message: "Invalid or expired refresh token" };
  }
};

const getAllUsers = async () => {
  try {
    const query = `
      SELECT user_id, name, email, role, status, created_at
      FROM users
      ORDER BY user_id ASC
    `;
    const result = await con.query(query); 
    return { status: 200, data: result.rows };
  } catch (error) {
    console.error("Error Fetching Users:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const updateUserStatus = async (userId, status) => {
  try {
    const query = `
      UPDATE users SET status = $1 WHERE user_id = $2 RETURNING *
    `;
    const result = await con.query(query, [status, userId]);

    if (result.rows.length === 0)
      return { status: 404, message: "User not found" };

    return {
      status: 200,
      message: "User status updated",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error Updating Status:", error);
    return { status: 500, message: "Internal server error" };
  }
};

module.exports = {
  authLogin,
  registerUser,
  getAllUsers,
  updateUserStatus,
  refreshAccessToken,
  authHeaderLogin,
};
