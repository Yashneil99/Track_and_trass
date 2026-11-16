import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";

import locationPin from "../../Assests/images/location-pin.png";
import cartImage from "../../Assests/images/animated_cart.gif";

const CartTrackingModal = ({
  open,
  handleClose,
  status,
  materials = [],
}) => {
  const isTransit = status === "In Transit";
  const isDelivered = status === "Delivered";

  const [viewCart, setViewCart] = useState(false);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {viewCart ? "Cart Materials View" : "Cart Tracking"}
      </DialogTitle>

      <DialogContent dividers sx={{ height: 450 }}>
        {/* ========================= */}
        {/* TRACKING VIEW */}
        {/* ========================= */}
        {!viewCart ? (
          <>
            <Box
              sx={{
                position: "relative",
                height: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="100%"
                height="220"
                viewBox="0 0 600 220"
                style={{ position: "absolute", top: 0 }}
              >
                {/* Dotted Path */}
                <path
                  id="motionPath"
                  d="M80 170 Q 250 30 350 120 T 520 130"
                  stroke="black"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray="8 8"
                />

                {/* 🚀 Moving Cart */}
                {isTransit && (
                  <g transform="translate(0,-50)">
                    <image href={cartImage} width="40" height="40">
                      <animateMotion
                        dur="4s"
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href="#motionPath" />
                      </animateMotion>
                    </image>
                  </g>
                )}

                {/* ✅ Delivered Cart */}
                {isDelivered && (
                  <image
                    href={cartImage}
                    x="500"
                    y="70"
                    width="40"
                    height="40"
                  />
                )}
              </svg>

              {/* FROM */}
              <Box
                sx={{
                  position: "absolute",
                  left: 50,
                  bottom: 30,
                  textAlign: "center",
                }}
              >
                <img src={locationPin} alt="From" width={40} />
                <Typography fontWeight={600}>Warehouse A</Typography>
              </Box>

              {/* TO */}
              <Box
                sx={{
                  position: "absolute",
                  right: 50,
                  top: 40,
                  textAlign: "center",
                }}
              >
                <img src={locationPin} alt="To" width={40} />
                <Typography fontWeight={600}>Assembly Unit</Typography>
              </Box>
            </Box>

            {/* STATUS */}
            <Box textAlign="center" mt={2}>
              <Typography
                sx={{
                  fontWeight: 600,
                  color:
                    status === "Delivered"
                      ? "green"
                      : status === "In Transit"
                      ? "#388087"
                      : "#f57c00",
                }}
              >
                Status: {status}
              </Typography>
            </Box>
          </>
        ) : (
          /* ========================= */
          /* REALISTIC SVG CART VIEW */
          /* ========================= */
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="500" height="350" viewBox="0 0 500 350">
              {/* CART BASE */}
              <rect
                x="120"
                y="150"
                width="260"
                height="120"
                rx="15"
                fill="#f5f5f5"
                stroke="#444"
                strokeWidth="4"
              />

              {/* CART FRONT BAR */}
              <line
                x1="120"
                y1="150"
                x2="80"
                y2="110"
                stroke="#444"
                strokeWidth="6"
              />

              {/* WHEELS */}
              <circle cx="170" cy="290" r="22" fill="#444" />
              <circle cx="330" cy="290" r="22" fill="#444" />
              <circle cx="170" cy="290" r="10" fill="#888" />
              <circle cx="330" cy="290" r="10" fill="#888" />

              {/* STACKED MATERIALS */}
              {materials.map((mat, index) => (
                <g key={index}>
                  <rect
                    x="150"
                    y={230 - index * 35}
                    width="200"
                    height="30"
                    rx="6"
                    fill="#388087"
                  />
                  <text
                    x="250"
                    y={250 - index * 35}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {mat.name || `Material ${index + 1}`}
                  </text>
                </g>
              ))}

              {/* Empty Cart Message */}
              {materials.length === 0 && (
                <text
                  x="250"
                  y="210"
                  textAnchor="middle"
                  fill="#999"
                  fontSize="16"
                >
                  Cart is Empty
                </text>
              )}
            </svg>
          </Box>
        )}
      </DialogContent>

      {/* ========================= */}
      {/* ACTION BUTTONS */}
      {/* ========================= */}
      <DialogActions>
        {!viewCart ? (
          <Button
            onClick={() => setViewCart(true)}
            variant="contained"
            sx={{
              backgroundColor: "#388087",
              textTransform: "none",
              "&:hover": { backgroundColor: "#2f6d73" },
            }}
          >
            View Cart
          </Button>
        ) : (
          <Button
            onClick={() => setViewCart(false)}
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Back
          </Button>
        )}

        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            color: "#388087",
            borderColor: "#388087",
            textTransform: "none",
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CartTrackingModal;
