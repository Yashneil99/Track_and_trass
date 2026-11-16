const jwt = require("jsonwebtoken");
const secretKey = process.env.REFRESH_TOKEN_SECRET;

const refresh = (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required" });

  try {
    const decoded = jwt.verify(token, secretKey, { ignoreExpiration: true });
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      secretKey,
      { expiresIn: "6h" }
    );
    res.status(200).json({ token: newToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = refresh;
