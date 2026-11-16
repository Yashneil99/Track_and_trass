import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  IconButton,
  InputAdornment,
  Checkbox,
  Link,
  Alert,
  Snackbar,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../features/auth/authSlice";
import { ROUTES } from "../../components/constant/routes";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter both Email and Password!");
      setOpen(true);
      return;
    }

    try {
      await dispatch(login({ email, password })).unwrap();
      setMessage("Login Successful!");
      setOpen(true);
      navigate(ROUTES.HOME, { replace: true });
    } catch (error) {
      if (error?.message?.includes("locked")) {
        setMessage("Account locked: " + error.message.split(":")[1]);
      } else if (error?.validationErrors) {
        const errors = error.validationErrors;
        setMessage(errors.email || errors.password || "Validation failed");
      } else {
        setMessage("Invalid credentials, please try again!");
      }
      setOpen(true);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        "@keyframes spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      }}
    >
      {/* Snackbar */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={message.includes("Success") ? "success" : "error"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: "950px" }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            backgroundColor: "#fff",
          }}
        >
          {/* LEFT PANEL */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, #ffffff, #ccfbf1)",
              p: 6,
              textAlign: "center",
            }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: 160,
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    border: "2px dashed #5eead4",
                    animation: "spin 12s linear infinite",
                  }}
                />

                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: "20px",
                    background: "linear-gradient(135deg, #14b8a6, #0f766e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  }}
                >
                  <Inventory2OutlinedIcon
                    sx={{ fontSize: 55, color: "#fff" }}
                  />
                </Box>
              </Box>
            </motion.div>

            <Typography variant="h5" fontWeight="700" mt={3}>
              Track & Trace
            </Typography>
          </Box>

          {/* RIGHT PANEL */}
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <Typography variant="h6" mt={3} mb={1} fontWeight="600">
              Login
            </Typography>

            <Typography variant="body2" color="text.secondary" mb={2}>
              Please login to your account
            </Typography>

            <form onSubmit={handleSubmit}>
              <TextField
                label="Email Address *"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <TextField
                label="Password *"
                type={showPassword ? "text" : "password"}
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePasswordVisibility}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 1,
                }}
              >
                <Box display="flex" alignItems="center">
                  <Checkbox size="small" />
                  <Typography variant="body2">
                    Remember Me
                  </Typography>
                </Box>

                <Link href="#" underline="hover" fontSize={13}>
                  Forgot Password?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  py: 1.3,
                  borderRadius: "10px",
                  fontWeight: "700",
                  background:
                    "linear-gradient(to right, #0f766e, #14b8a6)",
                  boxShadow: "0 5px 15px rgba(20,184,166,0.4)",
                }}
              >
                LOGIN
              </Button>

              <Typography variant="body2" textAlign="center" mt={3}>
                Don’t have an account?{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => navigate(ROUTES.REGISTER)}
                  sx={{ fontWeight: "600" }}
                >
                  Register
                </Link>
              </Typography>
            </form>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}