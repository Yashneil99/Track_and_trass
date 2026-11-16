import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllLocation,
  fetchLocationTree,
} from "../../features/location/locationSlice";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Divider,
  List,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { FloorPlan } from "./floorplan";
import LocationBuilder from "./locationBuilder";
import { LocationTree } from "./locationTreeMain";
import { fetchAllCurrentMaterialPresenceAtAllLocations } from "../../features/materialMovement/materialMovementSlice";

const Locations = () => {
  const dispatch = useDispatch();
  const { data: rows } = useSelector((state) => state.materialMovement);

  // 🔹 Local State
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState("tree");

  // 🔹 Handlers
  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleViewChange = (event, newView) => {
    if (newView !== null) setView(newView);
  };

  // 🔹 API Calls
  useEffect(() => {
    dispatch(fetchAllCurrentMaterialPresenceAtAllLocations());
  }, [dispatch]);


  return (
    <Box sx={{ p: 2 }}>
      {/* ================= HEADER ================= */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        {/* Add Location */}
        <Button
          onClick={handleClickOpen}
          startIcon={<AddIcon />}
          sx={{
            backgroundColor: "#0f8f83",
            color: "#fff",
            borderRadius: "12px",
            px: 3,
            py: 1.2,
            textTransform: "none",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "#0c7a70",
            },
          }}
        >
          Add Location
        </Button>

        {/* Switch Toggle */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            background: "#f5f5f5",
            borderRadius: "20px",
            px: 2,
            py: 0.5,
          }}
        >
          <Typography fontSize={14}>Tree</Typography>

          <Switch
            checked={view === "floor"}
            onChange={(e) => setView(e.target.checked ? "floor" : "tree")}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: "#0f8f83",
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "#0f8f83",
              },
            }}
          />

          <Typography fontSize={14}>Floor</Typography>
        </Box>
      </Box>

      {/* ================= DIALOG ================= */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="lg" // ✅ FIXED
      >
        <DialogTitle sx={{
          textAlign: "center",
          fontWeight: 500,
          fontSize: "20px",
          py: 1.5,
          backgroundColor: "#e0f2f1",
          borderBottom: "2px solid #009688",
          position: "relative",
          color: "#009689",
        }}
        >Location Builder - Floor Plan</DialogTitle>
        <Divider />

        <Box sx={{ maxHeight: "80vh", overflowY: "auto", p: 2 }}>
          <LocationBuilder onClose={setOpen} />
        </Box>

        <Divider />
        <DialogActions>
          <Button
            sx={{ borderColor: "#009688", color: "#009688" }}
            onClick={handleClose}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= MAIN CONTENT ================= */}
      <Box
        sx={{
          height: "auto",
          border: "1px solid #DDD",
          borderRadius: 2,
          bgcolor: "#FFF",
          overflowY: "auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        {/* 🌳 TREE VIEW */}
        {view === "tree" && (
          <>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ p: 2, borderBottom: "1px solid #EEE", textAlign: "center" }}
            >
              Locations Tree
            </Typography>

            <List sx={{ px: 1 }}>
              {rows
                ?.filter((node) => node && node.type)
                .map((node) => (
                  <LocationTree key={node.code} node={node} />
                ))}
            </List>
          </>
        )}

        {/* 🗺️ FLOOR PLAN */}
        {view === "floor" && (
          <>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                p: 2,
                textAlign: "center",
                borderBottom: "1px solid #EEE",
              }}
            >
              Floor Plan
            </Typography>

            <Box sx={{ p: 2 }}>
              <FloorPlan locations={rows} />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default Locations;
