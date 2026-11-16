import React, { useState } from "react";
import { TextField, Button, Box, Typography, Snackbar, Alert } from "@mui/material";
import "./admin.css";
import { useDispatch, useSelector } from "react-redux";
import{createProcess,clearProcessError} from "../../features/process/processSlice";
import { unwrapResult } from "@reduxjs/toolkit";
import { useEffect } from "react";

export default function ProcessForm() {
  const dispatch = useDispatch();
  const [openSnack, setOpenSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");
  const processState = useSelector((state) => state.process);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      name: e.target.processName.value,
      description: e.target.description.value,
      input_material_types: e.target.inputMaterials.value,
      output_material_types: e.target.outputMaterials.value,
    };

    try {
      await dispatch(createProcess(formData));
        if (processState?.status === "succeeded" && processState.lastCreated !== null) {
      setSnackMsg("Process created successfully");
      setSnackSeverity("success");
      setOpenSnack(true);
    }
      e.target.reset();
    } catch (err) {
      setSnackMsg(processState.error || "Failed to create process");
      setSnackSeverity("error");
      setOpenSnack(true);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="data-form"
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography variant="h5">Add Material Process Details</Typography>
      <TextField name="processName" label="Process Name" variant="outlined" required />
      <TextField name="description" label="Description" variant="outlined" required />
      <TextField name="inputMaterials" label="Input Material Type" variant="outlined" required />
      <TextField name="outputMaterials" label="Output Material Type" variant="outlined" required />

      <Button type="submit" variant="contained" className="submit-btn" sx={{ mt: 2 }}>
        Submit
      </Button>
      <Snackbar
        open={openSnack}
        autoHideDuration={4500}
        onClose={() => {
          setOpenSnack(false);
          dispatch(clearProcessError());
        }}

      >
        <Alert severity={snackSeverity} sx={{ width: "100%" }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
