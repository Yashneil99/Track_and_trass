const verifyToken = require("./verifyToken.js");

const requireLogin = (req, res, next) => {
  verifyToken(req, res, () => {
    next();
  });
};

module.exports = requireLogin;
