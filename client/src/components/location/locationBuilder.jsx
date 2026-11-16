import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  Typography,
  Divider,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { useLocationState } from "../../hooks/useLocationState";
import { LocationForm } from "./locationForm";
import { LocationTree } from "./locationTree";
import { FloorPlan } from "./floorplan";
import { createBulkLocations } from "../../features/location/locationSlice";
import { useDispatch } from "react-redux";
import { fetchAllCurrentMaterialPresenceAtAllLocations } from "../../features/materialMovement/materialMovementSlice";

export default function LocationBuilder({onClose}) {
  const dispatch = useDispatch();
  const { locations, addLocation, removeLocation, updateLocation } = useLocationState();
  const [locationList, setLocationList] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (locations) {
      setLocationList(locations);
    }
  }, [locations]);

  const handleAddLocation = (newLocation) => {
    addLocation(newLocation, newLocation.parent);
    setSelectedLocation(null); // Clear context selection
  };

  const handleUpdateLocation = (updatedLocation) => {
    if (updateLocation) {
      console.log(updatedLocation);
      
      updateLocation(updatedLocation);
    } else {
      console.warn("updateLocation dispatch execution fallback processing setup:", updatedLocation);
    }
    setSelectedLocation(null);
  };

  const handleResetForm = () => {
    setSelectedLocation(null);
    setShowForm(false);
    setTimeout(() => setShowForm(true), 10);
  };

  const flattenLocations = (node, parentId = null) => {
    if (!node) return [];

    const attributesObject = Object.fromEntries(
      (node.attributes || [])
        .filter((attr) => attr.key && attr.key.trim() !== "")
        .map((attr) => [attr.key, attr.value])
    );

    const currentRow = {
      code: node.code,
      name: node.name,
      type: node.type,
      parent: parentId,
      stack: node.stack || null,
      attributes: attributesObject,
    };

    if (!Array.isArray(node.children) || node.children.length === 0) {
      return [currentRow];
    }

    return [
      currentRow,
      ...node.children.flatMap((child) => flattenLocations(child, node.code)),
    ];
  };

  const saveLocations = async () => {
    try {
      setIsSaving(true);
      const flatList = Array.isArray(locations)
        ? locations.flatMap((node) => flattenLocations(node))
        : flattenLocations(locations);

      console.log("Saving locations payload structures:", flatList);
      await dispatch(createBulkLocations({ locations: flatList })).unwrap();
      setSnackbar({
        open: true,
        message: "Configuration saved successfully!",
        severity: "success",
      });
      await dispatch(fetchAllCurrentMaterialPresenceAtAllLocations());
     if (typeof onClose === 'function') {
      onClose(); 
    }
    } catch (error) {
      console.error("Error saving bulk structures collection:", error);
      // `error` is the backend's message string (from rejectWithValue), e.g.
      // "Duplicate location code(s) in this configuration: HUL_KOL. ...".
      const message =
        typeof error === "string"
          ? error
          : error?.message || "Failed to save configuration. Please try again.";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: "1600px", margin: "0 auto" }}>
      {/* HEADER ACTION CONTROL ROW */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box flexGrow={1}>
          <Typography variant="h4" fontWeight="600" color="text.primary">
            Location Builder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Construct facility node trees and map layouts in real-time.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={saveLocations}
          disabled={isSaving}
          sx={{
            px: 3,
            py: 1,
            fontWeight: "600",
            boxShadow: 2,
            alignSelf: { xs: "stretch", sm: "auto" },
          }}
        >
          {isSaving ? "Saving Configuration..." : "Save Configuration"}
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* LEFT PANEL: TREE STRUCTURE & FORMS */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {showForm && (
              <LocationForm
                locations={locations}
                onAddLocation={handleAddLocation}
                onUpdateLocation={handleUpdateLocation}
                onResetForm={handleResetForm}
                selectedLocation={selectedLocation}
              />
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight="600" mb={2}>
              Structure Hierarchy
            </Typography>
            <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: "300px" }}>
              <LocationTree
                locations={locations}
                onRemoveLocation={removeLocation}
                onEditLocation={(node) => setSelectedLocation(node)} // Connect selection modifier hook link
              />
            </Box>
          </Card>
        </Grid>

        {/* RIGHT PANEL: VISUAL RENDERING CANVAS */}
        <Grid item xs={12} md={8}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              height: "100%",
              minHeight: "650px",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "background.neutral",
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="600">
                Live Location Floor Plan
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Visualizing configuration mapping variables interactively.
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                backgroundColor: "#ffffff",
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                overflow: "auto",
              }}
            >
              <FloorPlan locations={locations} />
            </Box>
          </Card>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}