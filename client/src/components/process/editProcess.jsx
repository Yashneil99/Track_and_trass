import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button,
  Box,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialogContent-root": { padding: theme.spacing(2) },
  "& .MuiDialogActions-root": { padding: theme.spacing(1) },
}));

export default function EditProcess({ open, onClose, selectedRow, onSave }) {
  const [formData, setFormData] = useState({
    process_id: "",
    name: "",
    description: "",
    input_material_types: "",
    output_material_types: "",
  });

  const [openSnack, setOpenSnack] = useState(false);

  useEffect(() => {
    if (selectedRow) {
      setFormData({
        process_id: selectedRow.process_id,
        name: selectedRow.name || "",
        description: selectedRow.description || "",
        input_material_types: selectedRow.input_material_types || "",
        output_material_types: selectedRow.output_material_types || ""
    });
    }
  }, [selectedRow]);

  const handleChange = (key, value) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const handleSave = () => {
    
    const payload = {
      process_id: formData.process_id,
      name: formData.name,
      description: formData.description,
      input_material_types: formData.input_material_types
        .split(",")
        .map((s) => s.trim()),

      output_material_types: formData.output_material_types
        .split(",")
        .map((s) => s.trim()),
    }; 
    if (onSave) onSave(payload);

    setOpenSnack(true);
    onClose();
  };

  return (
    <>
      <BootstrapDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ bgcolor: "#6FB3B8", color: "white", fontWeight: "bold" }}
        >
          Edit Process
        </DialogTitle>

        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            {/* NAME */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                p: "10px 12px",
                bgcolor: "#fff",
              }}
            >
              <Typography variant="subtitle2">NAME</Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </Box>

            {/* DESCRIPTION */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                p: "10px 12px",
                bgcolor: "#fff",
              }}
            >
              <Typography variant="subtitle2">DESCRIPTION</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </Box>

            {/* INPUT TYPES */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                p: "10px 12px",
                bgcolor: "#fff",
              }}
            >
              <Typography variant="subtitle2">INPUT MATERIAL TYPES</Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.input_material_types}
                onChange={(e) =>
                  handleChange("input_material_types", e.target.value)
                }
                helperText="Comma separated"
              />
            </Box>

            {/* OUTPUT TYPES */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                p: "10px 12px",
                bgcolor: "#fff",
              }}
            >
              <Typography variant="subtitle2">OUTPUT MATERIAL TYPES</Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.output_material_types}
                onChange={(e) =>
                  handleChange("output_material_types", e.target.value)
                }
                helperText="Comma separated"
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            sx={{
              bgcolor: "#388087",
              color: "white",
              fontWeight: 600,
              "&:hover": { bgcolor: "#2f6d72" },
            }}
            onClick={handleSave}
          >
            Save Changes
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </BootstrapDialog>

      {/* Snackbar */}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        open={openSnack}
        autoHideDuration={4000}
        onClose={() => setOpenSnack(false)}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Process Updated Successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
