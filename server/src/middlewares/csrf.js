const csrf = require("csurf");

const csrfProtection = csrf({ cookie: true });

const generateCsrfToken = (req, res, next) => {
  const tempCsrf = csrf({ cookie: true });
  tempCsrf(req, res, () => {
    res.json({ csrfToken: req.csrfToken() });
  });
};

module.exports = {
  csrfProtection,
  generateCsrfToken,
};
