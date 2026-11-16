// Fallbacks.jsx
import { Box, CircularProgress, Typography, Skeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export function FullPageLoader() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Box
      role="status"
      aria-busy="true"
      sx={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
        p: 3,
        bgcolor: "background.default",
        position: "relative",
      }}
    >
      {/* Theme-colored animated title */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: "#009688",
          animation: "glowPulse 2s ease-in-out infinite",
        }}
      >
        Track n Trace
      </Typography>

      <style>
        {`
        @keyframes glowPulse {
          0% { text-shadow: 0 0 2px ${primary}88; }
          50% { text-shadow: 0 0 14px ${primary}; }
          100% { text-shadow: 0 0 2px ${primary}88; }
        }
        `}
      </style>

      {/* Loader Row */}
      <Box display="flex" alignItems="center" gap={3} mt={2}>
        <CircularProgress size={55} thickness={4.5} color="primary" />
        <Typography variant="h6" color="text.secondary">
          Preparing your dashboard…
        </Typography>
      </Box>

      {/* Skeleton Text */}
      <Box width="400px" maxWidth="90%" sx={{ mt: 1 }}>
        <Skeleton height={14} />
        <Skeleton height={14} sx={{ mt: 1 }} />
        <Skeleton height={14} sx={{ mt: 1 }} />
      </Box>

      {/* Subtitle */}
      <Typography variant="body2" color="text.disabled" textAlign="center">
        Fetching data. This should only take a moment.
      </Typography>
    </Box>
  );
}
