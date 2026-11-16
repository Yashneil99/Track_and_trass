import React from "react";
import { Box, Typography, Paper, Grid } from "@mui/material";

import STNUpload from "./STNUpload";
import STNDocumentsView from "./STNDocumentsView";

// Shared style for cards to maintain professional consistency
const cardStyle = {
  borderRadius: "16px",
  p: 3,
  border: "1px solid #e5e7eb",
  backgroundColor: "#fff",
  height: "100%",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
};

const Settings = () => {
  return (
    <Box sx={{ backgroundColor: "#f4f5f7", minHeight: "100vh", p: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} color="#0f172a" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload STN documents and manage the uploaded files.
        </Typography>
      </Box>

      {/* Upload form is narrow; the files list gets the wider column so its
          per-file action buttons fit on one row. */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={cardStyle}>
            <STNUpload />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={cardStyle}>
            <STNDocumentsView />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
