


import React, { useState, useEffect } from "react";
import { TextField, Button, Box, Typography, Grid, IconButton, Snackbar, Alert } from '@mui/material';
import { useDispatch, useSelector } from "react-redux";
import DeleteIcon from '@mui/icons-material/Delete';
import './admin.css';
import { createLocation, clearLocationError } from "../../features/location/locationSlice";
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function LocationForm() {
  const dispatch = useDispatch();
  const locationState = useSelector((state) => state.location);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "",
    layout: null,
    attributes: [{ key: "", value: "" }]
  });

  const [openSnack, setOpenSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState({});


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
      attributes: [...formData.attributes, { key: "", value: "" }]
    });
  };

  const handleRemoveAttribute = (index) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, i) => i !== index)
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  // ---- VALIDATION ----
  const newErrors = {};

  if (formData.name.length > 250) newErrors.name = true;
  if (formData.code.length > 250) newErrors.code = true;
  if (formData.type.length > 250) newErrors.type = true;

  formData.attributes.forEach((attr, index) => {
    if (attr.key.length > 250) newErrors[`key-${index}`] = true;
    if (attr.value.length > 250) newErrors[`value-${index}`] = true;
  });

  setErrors(newErrors);

  // STOP SUBMISSION if any errors
  if (Object.keys(newErrors).length > 0) {
    setSnackMsg("Please fix errors before submitting");
    setSnackSeverity("error");
    setOpenSnack(true);
    return;
  }

  // ---- SUBMIT ----
  try {
    const attributesObject = Object.fromEntries(
      formData.attributes
        .filter((attr) => attr.key.trim() !== "")
        .map((attr) => [attr.key, attr.value])
    );
    let layoutObject = null;
    if (formData.layout instanceof File) {
    try {
      const fileText = await formData.layout.text();   // read file text
      layoutObject = JSON.parse(fileText);             // convert to JSON object
    } catch (error) {
      console.error("Invalid JSON file:", error);
      alert("Uploaded layout file is not valid JSON.");
      return;
    }
  }

    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
         layout: layoutObject, 
      attributes: attributesObject,
    };

 const result = await dispatch(createLocation(payload));

  if (result.payload?.message === "New location added successfully"
  ) {
    
    setSnackMsg("Location created successfully");
    setSnackSeverity("success");
    setOpenSnack(true);

    // Reset form fields
    setFormData({
      name: "",
      code: "",
      type: "",
      layout: null,
      attributes: [{ key: "", value: "" }],
    });
    setFileName("");
    setErrors({});
  } else {
    // ❌ Failure
    setSnackMsg("Failed to create location");
    setSnackSeverity("error");
    setOpenSnack(true);
  }
  } catch (err) {
    setSnackMsg(locationState.error || "Failed to create location");
    setSnackSeverity("error");
    setOpenSnack(true);
  }
};
  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

return (
  <Box
    component="form"
    className="data-form"
    onSubmit={handleSubmit}
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: { xs: 2, sm: 3 },
      mt: { xs: 1, sm: 2, md: 3 },
      maxWidth: { xs: "100%", sm: "600px", md: "800px" },
      mx: "auto",
      px: { xs: 2, sm: 3 }
    }}
  >
    <Typography
      variant="h5"
      sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" } }}
    >
      Add Location Details
    </Typography>

    {/* LOCATION NAME & CODE side by side */}
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Location Name"
          variant="outlined"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={formData.name.length > 250}
          helperText={
            formData.name.length > 250 ? "Maximum 250 characters allowed" : ""
          }
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Location Code"
          variant="outlined"
          required
          fullWidth
          value={formData.code}
          onChange={(e) => handleChange("code", e.target.value)}
          error={formData.code.length > 250}
          helperText={
            formData.code.length > 250 ? "Maximum 250 characters allowed" : ""
          }
        />
      </Grid>
    </Grid>

    {/* LOCATION TYPE full row */}
    <Grid container spacing={2}>
      <Grid item xs={1} >
        <TextField
          label="Location Type"
          variant="outlined"
          required
          fullWidth
          value={formData.type}
          onChange={(e) => handleChange("type", e.target.value)}
          error={formData.type.length > 250}
          helperText={
            formData.type.length > 250 ? "Maximum 250 characters allowed" : ""
          }
        />
      </Grid>
    </Grid>

    {/* FILE UPLOAD full row */}
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          fullWidth
          sx={{
            mt: 2,
            backgroundColor: "#fcf7f7ff",
            color: "black",
            "&:hover": { backgroundColor: "#BADFE7" }
          }}
        >
          Upload File
          <VisuallyHiddenInput
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files[0];
              if (!file) return;
              if (
                file.type !== "application/json" &&
                !file.name.endsWith(".json")
              ) {
                alert("Only JSON files are allowed!");
                event.target.value = "";
                return;
              }
              setFormData({ ...formData, layout: file });
              setFileName(file.name);
            }}
          />
        </Button>
      </Grid>
    </Grid>

    {fileName && (
      <Typography sx={{ mt: 1, color: "green", fontSize: "14px" }}>
        {fileName} uploaded successfully!
      </Typography>
    )}

    {/* ATTRIBUTES */}
    <Typography variant="subtitle1" sx={{ mt: 2 }}>
      Location Attributes
    </Typography>

    {formData.attributes.map((attr, index) => (
      <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 1 }}>
        <Grid item xs={12} sm={5}>
          <TextField
            label="Key"
            variant="outlined"
            fullWidth
            value={attr.key}
            onChange={(e) =>
              handleAttributeChange(index, "key", e.target.value)
            }
            error={attr.key.length > 250}
            helperText={
              attr.key.length > 250 ? "Maximum 250 characters allowed" : ""
            }
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField
            label="Value"
            variant="outlined"
            fullWidth
            value={attr.value}
            onChange={(e) =>
              handleAttributeChange(index, "value", e.target.value)
            }
            error={attr.value.length > 250}
            helperText={
              attr.value.length > 250 ? "Maximum 250 characters allowed" : ""
            }
          />
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
        "&:hover": {
          borderColor: "#c9e2e8",
          backgroundColor: "#e0f2f1"
        }
      }}
    >
      + Add Attribute
    </Button>

    {/* SUBMIT full row */}
    <Grid container spacing={2}>
      <Grid item xs={12} >
        <Button
          type="submit"
          variant="contained"
          className="submit-btn"
          fullWidth
          sx={{ mt: 1 }}
        >
          Submit
        </Button>
      </Grid>
    </Grid>

    <Snackbar
      open={openSnack}
      autoHideDuration={4000}
      onClose={() => {
        setOpenSnack(false);
        dispatch(clearLocationError());
      }}
    >
      <Alert severity={snackSeverity} sx={{ width: "100%" }}>
        {snackMsg}
      </Alert>
    </Snackbar>
  </Box>
);



//   return (
// <Box component="form" className="data-form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
//   <Typography variant="h5">
//     Add Location Details
//   </Typography>

//   {/* LOCATION NAME */}
//   <TextField
//     label="Location Name"
//     variant="outlined"
//     required
//     fullWidth
//     value={formData.name}
//     onChange={(e) => handleChange("name", e.target.value)}
//     error={formData.name.length > 250}
//     helperText={formData.name.length > 250 ? "Maximum 250 characters allowed" : ""}
//   />

//   {/* LOCATION CODE */}
//   <TextField
//     label="Location Code"
//     variant="outlined"
//     required
//     fullWidth
//     value={formData.code}
//     onChange={(e) => handleChange("code", e.target.value)}
//     error={formData.code.length > 250}
//     helperText={formData.code.length > 250 ? "Maximum 250 characters allowed" : ""}
//   />

//       <TextField
//         label="Location Type"
//         variant="outlined"
//         required
//         fullWidth
//         value={formData.type}
//         onChange={(e) => handleChange("type", e.target.value)}
//         error={formData.type.length > 250}
//         helperText={formData.type.length > 250 ? "Maximum 250 characters allowed" : ""} 
//       />

//       {/* FILE UPLOAD - ONLY JSON ALLOWED */}
//       <Button
//         component="label"
//         variant="contained"
//         startIcon={<CloudUploadIcon />}
//         sx={{
//           mt: 2,
//           backgroundColor: "#fcf7f7ff",
//           color: "black",
//           "&:hover": { backgroundColor: "#BADFE7" }
//         }}
//       >
//         Upload File
//         <VisuallyHiddenInput
//           type="file"
//           accept="application/json,.json"
//           onChange={(event) => {
//             const file = event.target.files[0];

//             if (!file) return;

//             if (file.type !== "application/json" && !file.name.endsWith(".json")) {
//               alert("Only JSON files are allowed!");
//               event.target.value = "";
//               return;
//             }

//             setFormData({ ...formData, layout: file });
//             setFileName(file.name);
//           }}
//         />
//       </Button>

//       {fileName && (
//         <Typography sx={{ mt: 1, color: "green", fontSize: "14px" }}>
//           {fileName} uploaded successfully!
//         </Typography>
//       )}

//       {/* ATTRIBUTES */}
//       <Typography variant="subtitle1" sx={{ mt: 1 }}>Location Attributes</Typography>

//   {formData.attributes.map((attr, index) => (
//     <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 1 }}>

//       {/* KEY */}
//       <Grid item xs={5}>
//         <TextField
//           label="Key"
//           variant="outlined"
//           fullWidth
//           value={attr.key}
//           onChange={(e) =>
//             handleAttributeChange(index, "key", e.target.value)
//           }
//           error={attr.key.length > 250}
//           helperText={attr.key.length > 250 ? "Maximum 250 characters allowed" : ""}
//         />
//       </Grid>

//       {/* VALUE */}
//       <Grid item xs={5}>
//         <TextField
//           label="Value"
//           variant="outlined"
//           fullWidth
//           value={attr.value}
//           onChange={(e) =>
//             handleAttributeChange(index, "value", e.target.value)
//           }
//           error={attr.value.length > 250}
//           helperText={attr.value.length > 250 ? "Maximum 250 characters allowed" : ""}
//         />
//       </Grid>

//     </Grid>
//       ))}
//       <Button variant="outlined" onClick={handleAddAttribute} sx={{
//         alignSelf: "flex-start", borderColor: '#009688',
//         color: '#009688',
//         textTransform: 'none',
//         '&:hover': {
//           borderColor: '#c9e2e8',
//           backgroundColor: '#e0f2f1',
//         },
//       }}
//       >
//         + Add Attribute
//       </Button>
//       <Button type="submit" variant="contained" className="submit-btn" sx={{ mt: 1 }}>
//         Submit
//       </Button>
//       <Snackbar
//         open={openSnack}
//         autoHideDuration={4000}
//         onClose={() => {
//           setOpenSnack(false);
//           dispatch(clearLocationError());
//         }}
//       >
//         <Alert severity={snackSeverity} sx={{ width: "100%" }}>
//           {snackMsg}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );

}
