import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import "./admin.css";

import {
  createMaterial,
  clearMaterialError,
} from "../../features/material/materialSlice";
import CloseIcon from "@mui/icons-material/Close";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";

export default function MaterialForm({ onSuccess, onError }) {
  const dispatch = useDispatch();
  const materialState = useSelector((state) => state.material);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    uom: "",
    quantity: "",
    attributes: [{ key: "", value: "" }],
  });

  const [openSnack, setOpenSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  const [errors, setErrors] = useState({});

  const [files, setImages] = useState([]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAttributeChange = (index, field, value) => {
    const updated = [...formData.attributes];
    updated[index][field] = value;
    setFormData({ ...formData, attributes: updated });
  };

  const handleAddAttribute = () => {
    setFormData({
      ...formData,
      attributes: [...formData.attributes, { key: "", value: "" }],
    });
  };

  const handleRemoveAttribute = (index) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ---- VALIDATION ----
    const newErrors = {};

    if (!formData.name.trim()) {
      setSnackMsg("Material name is required");
      setSnackSeverity("warning");
      setOpenSnack(true);
      return;
    }

    if (formData.name.length > 250) newErrors.name = true;
    if (formData.code.length > 250) newErrors.code = true;
    if (formData.description.length > 250) newErrors.description = true;
    if (formData.uom.length > 250) newErrors.uom = true;

    formData.attributes.forEach((attr, index) => {
      if (attr.key.length > 250) newErrors[`key-${index}`] = true;
      if (attr.value.length > 250) newErrors[`value-${index}`] = true;
    });

    setErrors(newErrors);

    // STOP submission if there are errors
    if (Object.keys(newErrors).length > 0) {
      setSnackMsg("Please fix errors before submitting");
      setSnackSeverity("error");
      setOpenSnack(true);
      return;
    }

    // ---- PREPARE FORM DATA ----
    const attributesObject = Object.fromEntries(
      formData.attributes
        .filter((attr) => attr.key.trim() !== "")
        .map((attr) => [attr.key, attr.value]),
    );

    const formDataToSend = new FormData();
    formDataToSend.append("code", formData.code);
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("uom", formData.uom);
    formDataToSend.append("quantity", Number(formData.quantity));
    formDataToSend.append("attributes", JSON.stringify(attributesObject));

    files.forEach((file) => {
      formDataToSend.append("images", file);
    });

    // ---- SUBMIT ----
    try {
      const result = await dispatch(createMaterial(formDataToSend)).unwrap();
      if (
        result.status === 201
      ) {
        onSuccess("Material created successfully");
        setFormData({
          code: "",
          name: "",
          description: "",
          uom: "",
          quantity: "",
          attributes: [{ key: "", value: "" }],
        });
        setImages([]);
        setErrors({});
      } else {
        onError("Failed to create material");
      }
    } catch (error) {
      console.log(materialState.error, "error in form submission");
      onError(error.message || "Failed to create material");
    }
  };
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="data-form"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        mt: { xs: 1, sm: 2, md: 3 },
        maxWidth: "100%",
        mx: 0,
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* MATERIAL NAME */}
      <TextField
        label="Material Name"
        variant="outlined"
        required
        fullWidth
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        error={formData.name.length > 250}
        helperText={
          formData.name.length > 250 ? "Maximum 250 characters allowed" : ""
        }
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderRadius: "10px",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#009688", // green border
            },
          },
          "& .MuiInputLabel-root": {
            "&.Mui-focused": {
              color: "#009688", // green label
            },
          },
        }}
      />

      {/* MATERIAL CODE */}
      <TextField
        label="Material Code"
        variant="outlined"
        required
        fullWidth
        value={formData.code}
        onChange={(e) => handleChange("code", e.target.value)}
        error={formData.code.length > 250}
        helperText={
          formData.code.length > 250 ? "Maximum 250 characters allowed" : ""
        }
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderRadius: "10px", // <-- rounded corners
            },
            "&.Mui-focused fieldset": {
              borderColor: "#009688", // <-- dark green when focused
            },
          },
          "& .MuiInputLabel-root": {
            "&.Mui-focused": {
              color: "#009688", // green label
            },
          },
        }}
      />

      {/* DESCRIPTION */}
      <TextField
        label="Description"
        variant="outlined"
        required
        fullWidth
        value={formData.description}
        onChange={(e) => handleChange("description", e.target.value)}
        error={formData.description.length > 250}
        helperText={
          formData.description.length > 250
            ? "Maximum 250 characters allowed"
            : ""
        }
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderRadius: "10px", // <-- rounded corners
            },
            "&.Mui-focused fieldset": {
              borderColor: "#009688", // <-- dark green when focused
            },
          },
          "& .MuiInputLabel-root": {
            "&.Mui-focused": {
              color: "#009688", // green label
            },
          },
        }}
      />

      {/* UOM */}
      <TextField
        label="UOM"
        variant="outlined"
        required
        fullWidth
        value={formData.uom}
        onChange={(e) => handleChange("uom", e.target.value)}
        error={formData.uom.length > 250}
        helperText={
          formData.uom.length > 250 ? "Maximum 250 characters allowed" : ""
        }
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderRadius: "10px", // <-- rounded corners
            },
            "&.Mui-focused fieldset": {
              borderColor: "#009688", // <-- dark green when focused
            },
          },
          "& .MuiInputLabel-root": {
            "&.Mui-focused": {
              color: "#009688", // green label
            },
          },
        }}
      />

      {/* ATTRIBUTES SECTION */}
      <Typography variant="subtitle1">Material Attributes</Typography>

      {formData.attributes.map((attr, index) => (
        <Grid container spacing={2} key={index} alignItems="flex-start">
          {/* Key - Half Width */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Key"
              fullWidth
              variant="outlined"
              value={attr.key}
              onChange={(e) =>
                handleAttributeChange(index, "key", e.target.value)
              }
              error={attr.key.length > 250}
              helperText={
                attr.key.length > 250 ? "Maximum 250 characters allowed" : ""
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderRadius: "10px", // <-- rounded corners
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#009688", // <-- dark green when focused
                  },
                },
                "& .MuiInputLabel-root": {
                  "&.Mui-focused": {
                    color: "#009688", // green label
                  },
                },
              }}
            />
          </Grid>

          {/* Value - Half Width (Same size as Key) */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Value"
              fullWidth
              variant="outlined"
              value={attr.value}
              onChange={(e) =>
                handleAttributeChange(index, "value", e.target.value)
              }
              error={attr.value.length > 250}
              helperText={
                attr.value.length > 250 ? "Maximum 250 characters allowed" : ""
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderRadius: "10px", // <-- rounded corners
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#009688", // <-- dark green when focused
                  },
                },
                "& .MuiInputLabel-root": {
                  "&.Mui-focused": {
                    color: "#009688", // green label
                  },
                },
              }}
            />
          </Grid>

          {/* Delete Button */}
          <Grid item xs={12}>
            {formData.attributes.length > 1 && (
              <IconButton
                color="error"
                onClick={() => handleRemoveAttribute(index)}
                sx={{ mt: 0.5 }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Grid>
        </Grid>
      ))}

      <Button
        variant="outlined"
        onClick={handleAddAttribute}
        sx={{
          alignSelf: "flex-start",
          borderColor: "#009688",
          color: "#009688",
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "10px",
        }}
      >
        + Add Attribute
      </Button>

      {/* IMAGE UPLOAD */}
      <input
        type="file"
        accept="image/*"
        multiple
        id="image-upload"
        style={{ display: "none" }}
        onChange={handleImageChange}
      />
      <label htmlFor="image-upload">
        <Button
          variant="outlined"
          component="span"
          sx={{
            alignSelf: "flex-start",
            width: "100%",
            borderColor: "#009688",
            color: "#009688",
            textTransform: "none",
            display: "flex",
            alignItems: "center", // vertically center icon + text
            justifyContent: "center", // horizontally center content
            gap: 1, // spacing between icon and text
            fontWeight: 600,
            borderRadius: "10px",
          }}
        >
          <BrokenImageOutlinedIcon sx={{ color: "#009688", fontSize: 20 }} />+
          Upload Images
        </Button>
      </label>

      <Box sx={{ display: "flex", flexWrap: "wrap" }}>
        {files?.map((img, index) => (
          <Box key={index} sx={{ position: "relative" }}>
            <img
              src={URL.createObjectURL(img)}
              width="80"
              height="80"
              style={{ borderRadius: 4, objectFit: "cover" }}
              alt={`preview-${index}`}
            />
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                top: -8,
                right: -8,
                background: "white",
                "&:hover": { background: "#eee" },
              }}
              onClick={() => handleRemoveImage(index)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>

      {/* SUBMIT BUTTON */}
      {/* <Button
        type="submit"
        variant="contained"
        className="submit-btn"
        fullWidth
      >
        Submit
      </Button> */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{
          borderRadius: "10px",
          fontWeight: "700",
          background: "linear-gradient(to right, #0f766e, #14b8a6)",
        }}
      >
        Submit
      </Button>

      {/* Snackbar */}
      <Snackbar
        open={openSnack}
        autoHideDuration={4500}
        onClose={() => {
          setOpenSnack(false);
          dispatch(clearMaterialError());
        }}
      >
        <Alert severity={snackSeverity} sx={{ width: "100%" }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
