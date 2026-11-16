import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from "@mui/material";

const CartAddingModal = ({ open, handleClose }) => {
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Cart</DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Cart ID" fullWidth />
          <TextField label="Material ID" fullWidth />
          <TextField label="Total Weight" fullWidth />
          <TextField label="Total Count" fullWidth />
        </Box>
      </DialogContent>

      <DialogActions>
    <Button
    onClick={handleClose}
    variant="outlined"
    sx={{
        color: "#388087",
        borderColor: "#388087",
        textTransform: "none",
        "&:hover": {
        borderColor: "#2f6d73",
        backgroundColor: "rgba(56, 128, 135, 0.08)",
        },
    }}
    >
    Cancel
    </Button>

    <Button
    variant="contained"
    sx={{
        background: "linear-gradient(to right, #388087, #6FB3B8)",
        textTransform: "none",
        boxShadow: "none",
        "&:hover": {
        background: "linear-gradient(to right, #2f6d73, #5aa3a8)",
        boxShadow: "none",
        },
    }}
    >
    Save
    </Button>
        </DialogActions>
        
    </Dialog>
  );
};

export default CartAddingModal;
