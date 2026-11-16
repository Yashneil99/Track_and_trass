const authorizeRoles = (roles) => (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    next();
  } catch (error) {
    console.error("Authorization Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const authorizeAdmin = (req, res, next) => {
  return authorizeRoles(['ADMIN'])(req, res, next);
};

module.exports = {
  authorizeRoles,
  authorizeAdmin
};
