import React from "react";
import { Box, Typography } from "@mui/material";

export default function CircularProgressRing({ value }) {
  const strokeWidth = 8;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value < 50) return "#4caf50"; // Green
    if (value < 80) return "#ff9800"; // Orange
    return "#d32f2f";                // Red
  };

  return (
    <Box sx={{ position: "relative", width: 100, height: 100 }}>
      <svg width={100} height={100}>
        <circle
          stroke="#e6e6e6"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          stroke={getColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx="50"
          cy="50"
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
          }}
        />
      </svg>

      <Typography
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {Math.round(value)}%
      </Typography>
    </Box>
  );
}