// src/components/admin/MaterialInformation.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Typography, Button, Box, TextField,
  Snackbar, Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import { clearMaterialError } from "../../features/material/materialSlice";


const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialogContent-root": { padding: theme.spacing(2) },
  "& .MuiDialogActions-root": { padding: theme.spacing(1) },
}));

export default function MaterialInformation({
  open, handleClose, selectedMaterial, onSave, showActions
}) {
  const dispatch = useDispatch();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  useEffect(() => {
    if (selectedMaterial) {
      setFormData({ ...selectedMaterial });
      setEditMode(false);
      setNewAttrKey("");
      setNewAttrValue("");
    }
  }, [selectedMaterial]);

  useEffect(() => {
    if (open) {
      setEditMode(false);
    }
  }, [open]);


  if (!selectedMaterial) return null;

  const excludedKeys = ["attributes", "created_at", "material_id"];

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: key === "quantity" ? Number(value) : value
    }));
  };

  const handleAttributeChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  const handleRemoveImage = (index) => {
    const updated = formData.image_urls.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, image_urls: updated }));
  };

  const addNewAttribute = () => {
    if (!newAttrKey.trim()) return;
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [newAttrKey]: newAttrValue
      }
    }));
    setNewAttrKey("");
    setNewAttrValue("");
  };

  const handleSave = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.userId;

    const payload = {
      material_id: formData.material_id,
      code: formData.code,
      name: formData.name,
      description: formData.description,
      uom: formData.uom,
      quantity: Number(formData.quantity),
      attributes: formData.attributes,
      image_urls: formData.image_urls,
      user_id: userId
    };

    if (onSave) {
      onSave(payload);
      setEditMode(false);
      setTimeout(() => {
        handleClose();
      }, 500);
    }
  };

  return (
    <>
      <BootstrapDialog open={open} onClose={handleClose} PaperProps={{
        sx: {
          minWidth: "40%", height: "100vh", margin: 0,
        },
      }}
      >
        <DialogTitle sx={{ background: "linear-gradient(135deg, #0D9488, #14B8A6)", color: "white", fontWeight: "bold" }}>
          Material Information
        </DialogTitle>
        <IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            {Object.entries(formData).map(([key, value]) =>
              !excludedKeys.includes(key) &&
              typeof value !== "object" && (
                <Box key={key} sx={{ border: "1px solid #ddd", borderRadius: "6px", p: "10px 12px", bgcolor: "#fff" }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {key.replaceAll("_", " ").toUpperCase()}
                  </Typography>
                  {editMode ? (
                    <TextField fullWidth size="small"
                      value={value || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  ) : (
                    <Typography>{value || "—"}</Typography>
                  )}
                </Box>
              )
            )}
            <Box sx={{ border: "1px solid #ddd", borderRadius: "6px", p: 2, bgcolor: "white" }}>
              <Typography variant="subtitle2" color="text.secondary">IMAGES</Typography>
              {formData.image_urls && formData.image_urls.length > 0 ? (
                <Box sx={{ display: "flex", gap: 2, mt: 1, overflowX: "auto" }}>
                  {formData.image_urls.map((imgUrl, idx) => (
                    <Box key={idx} sx={{ position: "relative" }}>
                      <img
                        src={imgUrl}
                        alt={`img_${idx}`}
                        style={{
                          width: 90,
                          height: 90,
                          borderRadius: 6,
                          objectFit: "cover",
                          border: "1px solid #ccc"
                        }}
                      />
                      {editMode && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveImage(idx)}
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            bgcolor: "error.main",
                            color: "white",
                            "&:hover": { bgcolor: "error.dark" }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2">No images</Typography>
              )}
              {editMode && (
                <Box mt={2}>
                  <Button
                    component="label"
                    sx={{
                      bgcolor: "#6FB3B8",
                      color: "white",
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#388087" }
                    }}
                  >
                    Add Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(prev => ({
                            ...prev,
                            image_urls: [...(prev.image_urls || []), reader.result]
                          }));
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                </Box>
              )}
            </Box>
            <Box sx={{ border: "1px solid #ddd", borderRadius: "6px", p: "10px 12px", bgcolor: "white" }}>
              <Typography variant="subtitle2" color="text.secondary">ATTRIBUTES</Typography>
              {formData.attributes && Object.keys(formData.attributes).length > 0 ? (
                Object.entries(formData.attributes).map(([key, value]) => (
                  <Box key={key} mt={1} display="flex" gap={1}>
                    <Typography sx={{ width: "40%", fontWeight: 600 }}>{key}</Typography>
                    {editMode ? (
                      <TextField
                        fullWidth size="small"
                        value={value}
                        onChange={(e) => handleAttributeChange(key, e.target.value)}
                      />
                    ) : (
                      <Typography>{value}</Typography>
                    )}
                  </Box>
                ))
              ) : <Typography variant="body2">—</Typography>}
              {editMode && (
                <Box mt={2} display="flex" gap={1}>
                  <TextField label="Key" size="small" sx={{ width: "40%" }} value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)} />
                  <TextField label="Value" size="small" sx={{ width: "40%" }} value={newAttrValue} onChange={(e) => setNewAttrValue(e.target.value)} />
                  <Button sx={{ bgcolor: "#388087", color: "white", fontWeight: 600 }} onClick={addNewAttribute}>Add</Button>
                </Box>
              )}
            </Box>
            <Box sx={{ border: "1px solid #ddd", borderRadius: "6px", p: "10px 12px", bgcolor: "white" }}>
              <Typography variant="subtitle2" color="text.secondary">CREATED AT</Typography>
              <Typography>{formData.created_at ? new Date(formData.created_at).toLocaleString() : "—"}</Typography>
            </Box>
          </Box>
        </DialogContent>
        {/* <DialogActions>
          {!editMode ? (
            <Button sx={{ bgcolor: "#388087", color: "white", fontWeight: 600 }} onClick={() => setEditMode(true)}>Update</Button>
          ) : (
            <Button sx={{ bgcolor: "#388087", color: "white", fontWeight: 600 }} onClick={handleSave}>Save</Button>
          )}
          <Button onClick={handleClose}>Close</Button>
        </DialogActions> */}
        {showActions && (   // 👈 only show if flag true
          <DialogActions>
            {!editMode ? (
              <Button
                sx={{ background: "linear-gradient(135deg,#0D9488,#14B8A6)", color: "white", fontWeight: 600 }}
                onClick={() => {
                  setEditMode(true)
                }}
              >
                Update
              </Button>
            ) : (
              <Button
                sx={{ background: "linear-gradient(135deg,#0D9488,#14B8A6)", color: "white", fontWeight: 600 }}
                onClick={handleSave}
              >
                Save
              </Button>
            )}
            <Button onClick={handleClose}>Close</Button>
          </DialogActions>
        )}
      </BootstrapDialog>
    </>
  );
}
