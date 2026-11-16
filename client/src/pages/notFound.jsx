// NotFoundPage.jsx
import { Box, Typography, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ROUTES } from "../components/constant/routes";

export default function NotFoundPage() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 4,
        textAlign: "center",
        p: 3,
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* Animated Background Blur Balls */}
      <Box
        component={motion.div}
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        sx={{
          position: "absolute",
          width: 250,
          height: 250,
          bgcolor: primary,
          opacity: 0.18,
          filter: "blur(100px)",
          borderRadius: "50%",
          top: "10%",
          left: "15%",
        }}
      />

      <Box
        component={motion.div}
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
        sx={{
          position: "absolute",
          width: 300,
          height: 300,
          bgcolor: theme.palette.secondary.main,
          opacity: 0.18,
          filter: "blur(120px)",
          borderRadius: "50%",
          bottom: "8%",
          right: "10%",
        }}
      />

      {/* Glassmorphic Card */}
      <Box
        sx={{
          p: 5,
          px: 6,
          borderRadius: 4,
          backdropFilter: "blur(12px)",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Animated 404 */}
        <Typography
          component={motion.h1}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          variant="h1"
          sx={{
            fontWeight: 800,
            color: primary,
            textShadow: `0 0 20px ${primary}55`,
            letterSpacing: "4px",
          }}
        >
          404
        </Typography>

        <Typography
          variant="h5"
          sx={{ mt: 2, fontWeight: 600, color: "text.primary" }}
        >
          Page Not Found
        </Typography>

        <Typography
          variant="body1"
          sx={{ mt: 1, mb: 3, color: "text.secondary" }}
        >
          The page you are looking for doesn’t exist or has been moved.
        </Typography>

        <Button
          component={Link}
          to={ROUTES.HOME}
          variant="contained"
          size="large"
          sx={{
            mt: 1,
            px: 4,
            py: 1.3,
            borderRadius: 3,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 600,
            boxShadow: `0 4px 20px ${primary}55`,
          }}
        >
          Go Home
        </Button>
      </Box>
    </Box>
  );
}
