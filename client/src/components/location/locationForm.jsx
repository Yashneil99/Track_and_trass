// import React, { useState } from "react";
// import {
//     Box,
//     Grid,
//     Card,
//     Typography,
//     TextField,
//     Button,
//     MenuItem,
//     IconButton,
//     Divider,
//     FormControl,
//     InputLabel,
//     Select,
//     FormHelperText,
// } from "@mui/material";
// import AddIcon from "@mui/icons-material/AddCircleOutline";
// import DeleteIcon from "@mui/icons-material/Delete";
// import { MAIN_TYPES, STACKING_ALLOWED_FOR } from "../constant/constants";

// export function LocationForm({
//     locations,
//     onAddLocation,
//     onResetForm,
//     initialValues = {
//         code: null,
//         name: null,
//         type: null,
//         stack: null,
//         attributes: [{ key: "", value: "" }],
//         parent: null,
//         children: [],
//     },
// }) {
//     const [formData, setFormData] = useState(initialValues);
//     const [errors, setErrors] = useState({});

//     const validateForm = () => {
//         const newErrors = {};

//         if (!formData.code.trim()) {
//             newErrors.code = "Location code is required";
//         }

//         if (!formData.name.trim()) {
//             newErrors.name = "Location name is required";
//         }

//         if (!formData.type) {
//             newErrors.type = "Location type is required";
//         }

//         if (formData.type && STACKING_ALLOWED_FOR[formData.type]?.length > 0 && !formData.stack) {
//             newErrors.stack = "Stack type is required for this location type";
//         }

//         // if (!formData.parent) {
//         //     newErrors.parent = "Parent location is required";
//         // }

//         // // Special case: Allow ROOT as parent for initial locations
//         // if (formData.parent === DEFAULT_LOCATION.code && locations.length > 1) {
//         //     newErrors.parent = "Cannot add location under ROOT when other locations exist";
//         // }

//         setErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
//     };


//     const handleSubmit = (e) => {
//         e.preventDefault();
//         if (validateForm()) {
//             onAddLocation(formData);
//             onResetForm();
//         }
//     };

//     const handleChange = (field) => (e) => {
//         setFormData((prev) => ({ ...prev, [field]: e.target.value }));
//         if (errors[field]) {
//             setErrors((prev) => ({ ...prev, [field]: "" }));
//         }
//     };

//     const handleAttributeChange = (index, field, value) => {
//         const updated = [...formData.attributes];
//         updated[index][field] = value;
//         setFormData({ ...formData, attributes: updated });
//     };

//     const handleAddAttribute = () => {
//         setFormData({
//             ...formData,
//             attributes: [...formData.attributes, { key: "", value: "" }],
//         });
//     };

//     const handleRemoveAttribute = (index) => {
//         setFormData({
//             ...formData,
//             attributes: formData.attributes.filter((_, i) => i !== index),
//         });
//     };

//     const handleReset = () => {
//         setFormData(initialValues);
//         setErrors({});
//         onResetForm();
//     };

//     return (
//         <Card sx={{ p: 2 }}>
//             <Typography variant="h6" mb={2}>
//                 Add New Location
//             </Typography>

//             <form onSubmit={handleSubmit}>
//                 {/* NAME */}
//                 <TextField
//                     fullWidth
//                     label="Location Code"
//                     value={formData.code}
//                     onChange={handleChange("code")}
//                     error={Boolean(errors.code)}
//                     helperText={errors.code}
//                     sx={{ mb: 2 }}
//                 />

//                 <TextField
//                     fullWidth
//                     label="Location Name"
//                     value={formData.name}
//                     onChange={handleChange("name")}
//                     error={Boolean(errors.name)}
//                     helperText={errors.name}
//                     sx={{ mb: 2 }}
//                 />

//                 {/* TYPE */}
//                 <FormControl
//                     fullWidth
//                     error={Boolean(errors.type)}
//                     sx={{ mb: 2 }}
//                 >
//                     <InputLabel>Location Type</InputLabel>
//                     <Select
//                         value={formData.type}
//                         onChange={handleChange("type")}
//                         label="Location Type"
//                     >
//                         {MAIN_TYPES.map((t) => (
//                             <MenuItem key={t} value={t}>
//                                 {t}
//                             </MenuItem>
//                         ))}
//                     </Select>
//                     {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
//                 </FormControl>

//                 {/* STACK TYPE */}
//                 {formData.type && STACKING_ALLOWED_FOR[formData.type]?.length > 0 && (
//                     <FormControl
//                         fullWidth
//                         error={Boolean(errors.stack)}
//                         sx={{ mb: 2 }}
//                     >
//                         <InputLabel>Stack Type</InputLabel>
//                         <Select
//                             value={formData.stack}
//                             onChange={handleChange("stack")}
//                             label="Stack Type"
//                         >
//                             {STACKING_ALLOWED_FOR[formData.type].map((t) => (
//                                 <MenuItem key={t} value={t}>
//                                     {t}
//                                 </MenuItem>
//                             ))}
//                         </Select>
//                         {errors.stack && <FormHelperText>{errors.stack}</FormHelperText>}
//                     </FormControl>
//                 )}

//                 <Typography variant="subtitle1" sx={{ mt: -1, mb: 1 }}>
//                     Location Attributes
//                 </Typography>

//                 {formData.attributes.map((attr, index) => (
//                     <Grid container spacing={2} alignItems="center" key={index}>
//                         <Grid item xs={5}>
//                             <TextField
//                                 label="Key"
//                                 fullWidth
//                                 variant="outlined"
//                                 value={attr.key}
//                                 onChange={(e) =>
//                                     handleAttributeChange(index, "key", e.target.value)
//                                 }
//                                 error={attr.key.length > 250}
//                                 helperText={
//                                     attr.key.length > 250 ? "Maximum 250 characters allowed" : ""
//                                 }
//                             />
//                         </Grid>

//                         <Grid item xs={5}>
//                             <TextField
//                                 label="Value"
//                                 fullWidth
//                                 variant="outlined"
//                                 value={attr.value}
//                                 onChange={(e) =>
//                                     handleAttributeChange(index, "value", e.target.value)
//                                 }
//                                 error={attr.value.length > 250}
//                                 helperText={
//                                     attr.value.length > 250 ? "Maximum 250 characters allowed" : ""
//                                 }
//                             />
//                         </Grid>

//                         <Grid item xs={2}>
//                             {formData.attributes.length > 1 && (
//                                 <IconButton
//                                     color="error"
//                                     onClick={() => handleRemoveAttribute(index)}
//                                 >
//                                     <DeleteIcon />
//                                 </IconButton>
//                             )}
//                         </Grid>

//                          <Button
//                                 variant="outlined"
//                                 onClick={handleAddAttribute}
//                                 sx={{
//                                     alignSelf: "flex-start",
//                                     mt: 1,
//                                     borderColor: "#009688",
//                                     color: "#009688",
//                                     textTransform: "none",
//                                 }}
//                             >
//                                 + Add Attribute
//                             </Button>
//                     </Grid>
//                 ))}

//                 {/* PARENT */}
//                 <FormControl
//                     fullWidth
//                     error={Boolean(errors.parent)}
//                     sx={{ mb: 2,mt : 2 }}
//                 >
//                     <InputLabel>Parent Location</InputLabel>
//                     <Select
//                         value={formData.parent}
//                         onChange={handleChange("parent")}
//                         label="Parent Location"
//                     >
//                         {locations?.flatMap((node) => flattenForSelect(node))}
//                     </Select>
//                     {errors.parent && <FormHelperText>{errors.parent}</FormHelperText>}
//                 </FormControl>

//                 <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
//                     <Button
//                         type="submit"
//                         fullWidth
//                         variant="contained"
//                         startIcon={<AddIcon />}
//                         sx={{ background: "#009688", }}
//                     >
//                         Add Location
//                     </Button>
//                     <Button
//                         fullWidth
//                         variant="outlined"
//                         onClick={handleReset}
//                          sx={{  borderColor: "#009688", color: "#009688" }}
//                     >
//                         Reset
//                     </Button>
//                 </Box>
//             </form>
//         </Card>
//     );
// }

// function flattenForSelect(node, depth = 0) {
//     let items = [
//         <MenuItem key={node.code} value={node.code}>
//             {"— ".repeat(depth)}
//             {node.name}
//         </MenuItem>,
//     ];
//     node.children.forEach((c) => {
//         items = items.concat(flattenForSelect(c, depth + 1));
//     });
//     return items;
// }


import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Stack,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { MAIN_TYPES, STACKING_ALLOWED_FOR } from "../constant/constants";

export function LocationForm({
  locations = [],
  onAddLocation,
  onUpdateLocation, // New prop to handle updates
  onResetForm,
  selectedLocation = null, // New prop to pass the node being edited
  initialValues = {
    code: "",
    name: "",
    type: "",
    stack: "",
    attributes: [{ key: "", value: "" }],
    parent: "",
    children: [],
  },
}) {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const isEditMode = Boolean(selectedLocation);

  // Sync form data when a location is selected for editing
  useEffect(() => {
    if (selectedLocation) {
      // If your backend/state uses an object for attributes, map it to array for the form
      // e.g., { temp: "30" } -> [{ key: "temp", value: "30" }]
      const mappedAttributes = selectedLocation.attributes && typeof selectedLocation.attributes === 'object'
        ? Object.entries(selectedLocation.attributes).map(([key, value]) => ({ key, value }))
        : selectedLocation.attributes;

      setFormData({
        ...selectedLocation,
        attributes: mappedAttributes?.length > 0 ? mappedAttributes : [{ key: "", value: "" }],
        parent: selectedLocation.parent || "",
      });
    } else {
      setFormData(initialValues);
    }
    setErrors({});
  }, [selectedLocation]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.code?.trim()) newErrors.code = "Location code is required";
    if (!formData.name?.trim()) newErrors.name = "Location name is required";
    if (!formData.type) newErrors.type = "Location type is required";
    if (formData.type && STACKING_ALLOWED_FOR[formData.type]?.length > 0 && !formData.stack) {
      newErrors.stack = "Stack type is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      if (isEditMode) {
        onUpdateLocation(formData);
      } else {
        onAddLocation(formData);
      }
      handleReset();
    }
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleAttributeChange = (index, field, value) => {
    const updated = [...formData.attributes];
    updated[index] = { ...updated[index], [field]: value };
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

  const handleReset = () => {
    setFormData(initialValues);
    setErrors({});
    onResetForm();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="600">
            {isEditMode ? "Edit Location" : "Add New Location"}
          </Typography>
          <Chip 
            label={isEditMode ? "Edit Mode" : "Create Mode"} 
            size="small" 
            color={isEditMode ? "info" : "success"} 
            variant="outlined" 
          />
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Location Code"
              size="small"
              value={formData.code}
              onChange={handleChange("code")}
              error={Boolean(errors.code)}
              helperText={errors.code}
              disabled={isEditMode} // Usually Code (ID) is immutable
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Location Name"
              size="small"
              value={formData.name}
              onChange={handleChange("name")}
              error={Boolean(errors.name)}
              helperText={errors.name}
            />
          </Grid>
        </Grid>

        <FormControl fullWidth size="small" error={Boolean(errors.type)}>
          <InputLabel>Location Type</InputLabel>
          <Select value={formData.type} onChange={handleChange("type")} label="Location Type">
            {MAIN_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
          {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
        </FormControl>

        {formData.type && STACKING_ALLOWED_FOR[formData.type]?.length > 0 && (
          <FormControl fullWidth size="small" error={Boolean(errors.stack)}>
            <InputLabel>Stack Type</InputLabel>
            <Select value={formData.stack} onChange={handleChange("stack")} label="Stack Type">
              {STACKING_ALLOWED_FOR[formData.type].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth size="small">
          <InputLabel>Parent Location</InputLabel>
          <Select value={formData.parent} onChange={handleChange("parent")} label="Parent Location">
            <MenuItem value=""><em>None (Root Node)</em></MenuItem>
            {locations.flatMap((node) => flattenForSelect(node))}
          </Select>
        </FormControl>

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight="600" mb={1.5}>
            Custom Attributes
          </Typography>
          <Stack spacing={1.5}>
            {formData.attributes.map((attr, index) => (
              <Box key={index} display="flex" gap={1}>
                <TextField
                  label="Key"
                  size="small"
                  fullWidth
                  value={attr.key}
                  onChange={(e) => handleAttributeChange(index, "key", e.target.value)}
                />
                <TextField
                  label="Value"
                  size="small"
                  fullWidth
                  value={attr.value}
                  onChange={(e) => handleAttributeChange(index, "value", e.target.value)}
                />
                {formData.attributes.length > 1 && (
                  <IconButton color="error" onClick={() => handleRemoveAttribute(index)}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </Stack>
          <Button size="small" startIcon={<AddIcon />} onClick={handleAddAttribute} sx={{ mt: 1 }}>
            Add Attribute
          </Button>
        </Box>

        <Divider />

        <Stack direction="row" spacing={2}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            startIcon={isEditMode ? <EditIcon /> : <AddIcon />}
            sx={{ fontWeight: "600", textTransform: "none" }}
          >
            {isEditMode ? "Update Location" : "Create Node"}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleReset}
            startIcon={<RefreshIcon />}
            color="inherit"
            sx={{ fontWeight: "600", textTransform: "none" }}
          >
            {isEditMode ? "Cancel Edit" : "Reset Form"}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

function flattenForSelect(node, depth = 0) {
  const indentation = "\u00A0\u00A0".repeat(depth * 2);
  let items = [
    <MenuItem key={node.code} value={node.code} sx={{ pl: Math.max(2, depth * 2) }}>
      {depth > 0 ? `${indentation}└─ ` : ""}{node.name}
    </MenuItem>,
  ];
  if (node.children) {
    node.children.forEach((c) => {
      items = items.concat(flattenForSelect(c, depth + 1));
    });
  }
  return items;
}