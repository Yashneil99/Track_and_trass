import React, { useState } from "react";

import { Button, Typography, Box, TextField, Alert } from "@mui/material";

import {
  CloudUploadOutlined,
  Close,
  Add,
  DescriptionOutlined,
} from "@mui/icons-material";

import { uploadSTNFile , fetchSTNDocuments, } from "../../features/stn/stnslice";

import { useDispatch } from "react-redux";


const STNUpload = () => {
  const dispatch = useDispatch();

  const [showForm, setShowForm] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const [invoiceSTN, setInvoiceSTN] = useState("");

  const [uploadMessage, setUploadMessage] = useState(null); // { text, severity }

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setSelectedFile(file); // the drop zone shows the selected file name
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage({ text: "Please select a file first", severity: "warning" });
      return;
    }

    if (!invoiceSTN.trim()) {
      setUploadMessage({ text: "Please enter the STN number", severity: "warning" });
      return;
    }

    try {
      await dispatch(
        uploadSTNFile({
          file: selectedFile,
          invoiceSTN,
        }),
      ).unwrap();

      // REFRESH DOCUMENT LIST
      await dispatch(fetchSTNDocuments());

      setUploadMessage({ text: "File uploaded successfully!", severity: "success" });

      setSelectedFile(null);

      setInvoiceSTN("");

      setShowForm(false);
    } catch (error) {
      // Surface the server's actual reason (e.g. duplicate filename -> "already
      // uploaded, rename or delete first") rather than a blanket failure. The
      // service already unwraps error.response.data.message into error.message.
      setUploadMessage({
        text: error?.message || "Upload failed. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);

    setSelectedFile(null);

    setInvoiceSTN("");

    setUploadMessage(null);
  };

  return (
    <Box>
      {/* HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Document Upload
          </Typography>

          {/* <Typography variant="body2" color="text.secondary" mt={0.5}>
            STN No.
          </Typography> */}
        </Box>

        {!showForm ? (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setShowForm(true);
              setUploadMessage(null);
            }}
            sx={{
              backgroundColor: "#0f9d8a",
              borderRadius: "12px",
              textTransform: "none",
              px: 3,
              py: 1.2,
              fontWeight: 600,
              boxShadow: "0px 4px 10px rgba(0,0,0,0.12)",

              "&:hover": {
                backgroundColor: "#0b8a79",
              },
            }}
          >
            Add
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<Close />}
            onClick={handleCancel}
            sx={{
              backgroundColor: "#0f9d8a",
              borderRadius: "12px",
              textTransform: "none",
              px: 3,
              py: 1.2,
              fontWeight: 600,
              boxShadow: "0px 4px 10px rgba(0,0,0,0.12)",

              "&:hover": {
                backgroundColor: "#0b8a79",
              },
            }}
          >
            Cancel
          </Button>
        )}
      </Box>

      {/* EMPTY STATE */}
      {!showForm ? (
        <Box
          sx={{
            minHeight: "320px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <DescriptionOutlined
            sx={{
              fontSize: 80,
              color: "#d1d5db",
              mb: 2,
            }}
          />

          <Typography variant="body1" color="text.secondary">
            Click "Add" to upload new documents
          </Typography>
        </Box>
      ) : (
        <>
          {/* STN FIELD */}
          <Typography mb={1} fontWeight={600} fontSize="14px">
            STN No. *
          </Typography>

          <TextField
            fullWidth
            placeholder="Enter STN number"
            value={invoiceSTN}
            onChange={(e) => setInvoiceSTN(e.target.value)}
            sx={{
              mb: 3,

              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
              },
            }}
          />

          {/* FILE UPLOAD */}
          <Typography mb={1} fontWeight={600} fontSize="14px">
            File Upload *
          </Typography>

          <Box
            component="label"
            htmlFor="file-input"
            sx={{
              border: "2px dashed #d1d5db",
              borderRadius: "12px",
              p: 3,
              textAlign: "center",
              cursor: "pointer",
              display: "block",
              transition: "0.2s",

              "&:hover": {
                borderColor: "#0f9d8a",
                backgroundColor: "#f9fafb",
              },
            }}
          >
            <CloudUploadOutlined
              sx={{
                fontSize: 32,
                color: "#6b7280",
                mb: 1,
              }}
            />

            <Typography color="text.secondary">
              {selectedFile ? selectedFile.name : "Click to upload file"}
            </Typography>

            <input
              hidden
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={handleFileChange}
            />
          </Box>

          {/* SUBMIT BUTTON */}
          <Button
            fullWidth
            variant="contained"
            startIcon={<CloudUploadOutlined />}
            onClick={handleUpload}
            sx={{
              mt: 3,
              py: 1.5,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "16px",

              background: "linear-gradient(90deg, #0f9d8a 0%, #14b8a6 100%)",

              boxShadow: "none",

              "&:hover": {
                background: "linear-gradient(90deg, #0b8a79 0%, #0ea5a5 100%)",
              },
            }}
          >
            Submit
          </Button>
        </>
      )}

      {/* MESSAGE — outside the form so the success alert stays visible after
          upload closes the form */}
      {uploadMessage && (
        <Alert severity={uploadMessage.severity} sx={{ mt: 2, borderRadius: "12px" }}>
          {uploadMessage.text}
        </Alert>
      )}
    </Box>
  );
};

export default STNUpload;
