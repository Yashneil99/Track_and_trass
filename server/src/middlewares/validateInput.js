const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
      errors: {
        email: !email ? "Email is required" : null,
        password: !password ? "Password is required" : null
      }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format",
      errors: {
        email: "Please provide a valid email address"
      }
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long",
      errors: {
        password: "Password must be at least 8 characters long"
      }
    });
  }

  next();
};

const validateRegistrationInput = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All fields are required",
      errors: {
        name: !name ? "Name is required" : null,
        email: !email ? "Email is required" : null,
        password: !password ? "Password is required" : null
      }
    });
  }

  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      message: "Name must be between 2 and 50 characters",
      errors: {
        name: "Name must be between 2 and 50 characters"
      }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format",
      errors: {
        email: "Please provide a valid email address"
      }
    });
  }

  next();
};

module.exports = {
  validateLoginInput,
  validateRegistrationInput
};
