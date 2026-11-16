// import React, { useState } from "react";
// import { useDispatch } from "react-redux";
// import { register } from "../../features/auth/authSlice";
// import {
//   Box,
//   Button,
//   TextField,
//   Typography,
//   Snackbar,
//   Alert,
//   Divider,
// } from "@mui/material";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";

// export default function Register() {
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });

//   const [errors, setErrors] = useState({});
//   const [open, setOpen] = useState(false);
//   const [message, setMessage] = useState("");
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const validate = () => {
//     const newErrors = {};

//     if (!form.name.trim()) {
//       newErrors.name = "Name is required.";
//     } else if (form.name.length < 2 || form.name.length > 50) {
//       newErrors.name = "Name must be between 2 and 50 characters.";
//     }

//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
//       newErrors.email = "Please enter a valid email address.";
//     }

//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
//     if (!passwordRegex.test(form.password)) {
//       newErrors.password =
//         "Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number & 1 special character (@$!%*?&).";
//     }

//     if (form.password !== form.confirmPassword) {
//       newErrors.confirmPassword = "Passwords do not match.";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!validate()) return;

//     try {
//       const res = await dispatch(register(form));
//       if (res.meta.requestStatus === "fulfilled") {
//         setMessage("Registration successful!");
//         setOpen(true);
//         setTimeout(() => navigate("/login"), 1500);
//       }
//     } catch (error) {
//       if (error.validationErrors) {
//         // Handle server-side validation errors
//         const serverErrors = error.validationErrors;
//         const newErrors = {};

//         if (serverErrors.name) newErrors.name = serverErrors.name;
//         if (serverErrors.email) newErrors.email = serverErrors.email;
//         if (serverErrors.password) newErrors.password = serverErrors.password;

//         setErrors(newErrors);

//         // Show first error in snackbar
//         const firstError = Object.values(serverErrors)[0];
//         setMessage(firstError);
//       } else if (error.message.includes("already registered")) {
//         setErrors({ email: "Email is already registered" });
//         setMessage("Email is already registered");
//       } else {
//         setMessage("Registration failed. Please try again!");
//       }
//       setOpen(true);
//     }
//   };

//   const handleClose = (event, reason) => {
//     if (reason === "clickaway") return;
//     setOpen(false);
//   };

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         background: "linear-gradient(to right, #C2EDCE, #6FB3B8)",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: { xs: "20px", sm: "30px" },
//         textAlign: "center",
//       }}
//     >
//       {/* Snackbar for success/error */}
//       <Snackbar
//         open={open}
//         autoHideDuration={3000}
//         onClose={handleClose}
//         anchorOrigin={{ vertical: "top", horizontal: "center" }}
//       >
//         <Alert
//           onClose={handleClose}
//           severity={message.includes("successful") ? "success" : "error"}
//           variant="filled"
//           sx={{ width: "100%" }}
//         >
//           {message}
//         </Alert>
//       </Snackbar>

//       {/* Registration Card - Same design as Login */}
//       <motion.div
//         initial={{ opacity: 0, y: -40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.8, ease: "easeOut" }}
//       >
//         <Box
//           sx={{
//             position: "relative",
//             display: "flex",
//             flexDirection: { xs: "column", md: "row" },
//             alignItems: "center",
//             justifyContent: "center",
//             width: { xs: "90%", sm: 600, md: 850 },
//             backgroundColor: "white",
//             borderRadius: 4,
//             boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
//             overflow: "hidden",
//             paddingTop: "70px",
//           }}
//         >
//           {/* Title same as login */}
//           <Typography
//             variant="h3"
//             sx={{
//               position: "absolute",
//               top: "20px",
//               left: "50%",
//               transform: "translateX(-50%)",
//               fontWeight: "bold",
//               fontSize: { xs: "1.5rem", sm: "2rem", md: "2.3rem" },
//               background: "linear-gradient(90deg, #46bcd1ff, #0e6191ff)",
//               WebkitBackgroundClip: "text",
//               WebkitTextFillColor: "transparent",
//               letterSpacing: "1px",
//               textTransform: "uppercase",
//               textShadow: "1px 1px 3px rgba(0,0,0,0.3)",
//             }}
//           >
//             Track & Trace
//           </Typography>

//           {/* Left side image (same as login) */}
//           <Box
//             component="img"
//             src={require("../../Assests/images/login.jpg")} // ✅ same image as login
//             alt="Register illustration"
//             sx={{
//               width: { xs: "100%", md: "50%" },
//               height: "100%",
//               objectFit: "cover",
//             }}
//           />

//           {/* Right side form */}
//           <Box sx={{ width: { xs: "100%", md: "50%" }, padding: 4 }}>
//             <Typography
//               variant="h5"
//               align="center"
//               fontWeight="bold"
//               gutterBottom
//               sx={{ color: "#333" }}
//             >
//               Register
//             </Typography>

//             <Typography
//               variant="body2"
//               align="center"
//               sx={{ color: "gray", mb: 2 }}
//             >
//               Please fill in the details to create your account
//             </Typography>

//             <Divider sx={{ mb: 3 }} />

//             <Box component="form" onSubmit={handleSubmit}>
//               <TextField
//                 label="Full Name"
//                 name="name"
//                 fullWidth
//                 margin="normal"
//                 value={form.name}
//                 onChange={handleChange}
//                 helperText={errors.name}
//                 error={!!errors.name}
//               />

//               <TextField
//                 label="Email Address"
//                 name="email"
//                 fullWidth
//                 margin="normal"
//                 value={form.email}
//                 onChange={handleChange}
//                 helperText={errors.email}
//                 error={!!errors.email}
//               />

//               <TextField
//                 label="Password"
//                 name="password"
//                 type="password"
//                 fullWidth
//                 margin="normal"
//                 value={form.password}
//                 onChange={handleChange}
//                 helperText={errors.password}
//                 error={!!errors.password}
//               />

//               <TextField
//                 label="Confirm Password"
//                 name="confirmPassword"
//                 type="password"
//                 fullWidth
//                 margin="normal"
//                 value={form.confirmPassword}
//                 onChange={handleChange}
//                 helperText={errors.confirmPassword}
//                 error={!!errors.confirmPassword}
//               />

//               <Button
//                 variant="contained"
//                 fullWidth
//                 type="submit"
//                 sx={{
//                   mt: 3,
//                   background: "linear-gradient(to right, #388087, #6FB3B8)",
//                   fontWeight: "bold",
//                   borderRadius: "25px",
//                   py: 1.2,
//                   fontSize: "16px",
//                 }}                    
//               >
//                 Register
//               </Button>

//               <Typography
//                 align="center"
//                 variant="body2"
//                 sx={{ mt: 2, color: "gray" }}
//               >
//                 Already have an account?{" "}
//                 <span
//                   onClick={() => navigate("/login")}
//                   style={{
//                     cursor: "pointer",
//                     color: "#0e6191ff",
//                     fontWeight: "bold",
//                   }}
//                 >
//                   Login
//                 </span>
//               </Typography>
//             </Box>
//           </Box>
//         </Box>
//       </motion.div>
//     </Box>
//   );
// }
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
  FormControlLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { register } from "../../features/auth/authSlice";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setMessage("Please fill all fields!");
      setOpen(true);
      return;
    }

    if (!acceptedTerms) {
      setMessage("Please accept Terms & Conditions");
      setOpen(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match!");
      setOpen(true);
      return;
    }

    // Match the backend password policy so we fail fast with a clear message
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setMessage(
        "Password must be 8+ chars with uppercase, lowercase, number and special character (@$!%*?&)"
      );
      setOpen(true);
      return;
    }

    try {
      const res = await dispatch(
        register({
          name: formData.fullName, // backend expects `name`
          email: formData.email,
          password: formData.password,
        })
      );

      if (res.meta.requestStatus === "fulfilled") {
        setMessage("Account Created Successfully!");
        setOpen(true);
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setMessage(
          res.payload?.message || res.error?.message || "Registration failed. Please try again!"
        );
        setOpen(true);
      }
    } catch (err) {
      const msg = err?.validationErrors
        ? Object.values(err.validationErrors).find(Boolean)
        : err?.response?.data?.message || err?.message || "Registration failed. Please try again!";
      setMessage(msg);
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
      }}
    >
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={message.includes("Successfully") ? "success" : "error"}
          variant="filled"
        >
          {message}
        </Alert>
      </Snackbar>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: "1000px" }}
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
          {/* LEFT */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, #ffffff, #ccfbf1)",
              p: 6,
            }}
          >
            <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Box sx={{ position: "relative", width: 220, height: 220 }}>
                <Box
                  sx={{
                    width: 180,
                    height: 180,
                    borderRadius: "25px",
                    background: "linear-gradient(135deg, #14b8a6, #0f766e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Inventory2OutlinedIcon sx={{ fontSize: 80, color: "#fff" }} />
                </Box>

                <Box
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#5eead4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PersonAddAlt1Icon sx={{ color: "#fff", fontSize: 20 }} />
                </Box>

                <Box
                  sx={{
                    position: "absolute",
                    bottom: 20,
                    right: -10,
                    width: 45,
                    height: 45,
                    borderRadius: "50%",
                    background: "#22d3ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircleIcon sx={{ color: "#fff", fontSize: 22 }} />
                </Box>
              </Box>
            </motion.div>
          </Box>

          {/* RIGHT */}
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <Typography variant="h4" fontWeight="800" color="#0f766e" textAlign="center">
              TRACK & TRACE
            </Typography>

            <Typography variant="h6" textAlign="center" mt={1}>
              Create Account
            </Typography>

            <Typography variant="body2" textAlign="center" mb={3}>
              Please fill in the details to create your account
            </Typography>

            <form onSubmit={handleRegister}>
              <TextField fullWidth margin="normal" label="Full Name" onChange={(e) => handleChange("fullName", e.target.value)} />
              <TextField fullWidth margin="normal" label="Email Address" onChange={(e) => handleChange("email", e.target.value)} />

              <TextField
                fullWidth
                margin="normal"
                label="Password"
                type={showPassword ? "text" : "password"}
                onChange={(e) => handleChange("password", e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
              />

              <FormControlLabel
                control={<Checkbox onChange={(e) => setAcceptedTerms(e.target.checked)} />}
                label="I agree to Terms & Conditions"
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleRegister}
                sx={{
                  py: 1.2,
                  borderRadius: "10px",
                  fontWeight: "600",
                  textTransform: "none",
                   background:
                    "linear-gradient(to right, #0f766e, #14b8a6)",
                  boxShadow: "0 5px 15px rgba(20,184,166,0.4)",
                }}
              >
                Create Account
              </Button>

              <Typography textAlign="center" mt={2}>
                Already have an account?{" "}
                <Link component="button" onClick={() => navigate("/")}>
                  Login
                </Link>
              </Typography>
            </form>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}