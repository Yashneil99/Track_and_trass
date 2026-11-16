import React, { useState } from "react";
import {
  Box,
  Typography,
  Collapse,
  Paper,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import { LocationTreeMainEditDialogue } from "./locationTreeMainEditDialogue";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FactoryOutlinedIcon from "@mui/icons-material/FactoryOutlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import ViewWeekOutlinedIcon from "@mui/icons-material/ViewWeekOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CropSquareOutlinedIcon from "@mui/icons-material/CropSquareOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import YardOutlinedIcon from "@mui/icons-material/YardOutlined";
import DomainOutlinedIcon from "@mui/icons-material/DomainOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { useDispatch } from "react-redux";
import { deleteLocation } from "../../features/location/locationSlice";
import { DeleteOutline } from "@mui/icons-material";
import { fetchAllCurrentMaterialPresenceAtAllLocations } from "../../features/materialMovement/materialMovementSlice";

const ICON_MAP = {
  root: <AccountTreeOutlinedIcon />,
  campus: <DomainOutlinedIcon />,
  plant: <FactoryOutlinedIcon />,
  warehouse: <WarehouseOutlinedIcon />,
  building: <ApartmentOutlinedIcon />,
  floor: <LayersOutlinedIcon />,
  room: <MeetingRoomOutlinedIcon />,
  aisle: <ViewWeekOutlinedIcon />,
  rack: <StorageOutlinedIcon />,
  shelf: <Inventory2OutlinedIcon />,
  bin: <CropSquareOutlinedIcon />,
  slot: <CategoryOutlinedIcon />,
  pallet: <LocalShippingOutlinedIcon />,
  container: <Inventory2OutlinedIcon />,
  yard: <YardOutlinedIcon />
};

const TYPE_GROUPS = {
  leaf: ["slot", "pallet",],
  grid: ["yard", "bin"],
};

const isLeaf = (type) => TYPE_GROUPS.leaf.includes(type);
const isGrid = (type) => TYPE_GROUPS.grid.includes(type);

const renderIcon = (type) => {
  const icon = ICON_MAP[type];
  if (!icon) return null;

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "12px",
        background: "#0f8f83",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {React.cloneElement(icon, { sx: { color: "#fff" } })}
    </Box>
  );
};

export const LocationTree = ({ node, level = 0 }) => {
  const hasChildren = node.children?.length > 0;
  const dispatch = useDispatch();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [open, setOpen] = useState(
    // node.type === "plant" || node.type === "root"
  );

  const [editOpen, setEditOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const toggle = () => hasChildren && setOpen((p) => !p);

  const handleEditClick = (e, node) => {
    e.stopPropagation();
    setSelectedNode(node);
    console.log(node, 'node');
    setEditOpen(true);
  };

  const handleDelete = async (locationId) => {
    console.log(locationId);
    
    if (!window.confirm("Are you sure? This will delete the entire location tree.")) return;
    try {
      const result = await dispatch(deleteLocation(locationId)).unwrap();
      setSnackbar({ open: true, message: result.message, severity: 'success' });
      await dispatch(fetchAllCurrentMaterialPresenceAtAllLocations())
    } catch (error) {
      setSnackbar({ open: true, message: error || "Failed to delete", severity: 'error' });
    }
  };

  const expandBtn = hasChildren && (
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      sx={node.type === "yard" ? { color: "#fff" } : {}}
    >
      {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
    </IconButton>
  );

  const children = node.children?.map(
    (child) =>
      child && (
        <LocationTree
          key={child.code}
          node={child}
          level={level + 1}
        />
      )
  );

  /* ================= LEAF ================= */
  if (isLeaf(node.type)) {
    return (
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          border: "2px solid #0f8f83",
          borderRadius: "14px",
          px: 2,
          py: 1.2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          "&:hover": { background: "#f5fffd" },
        }}
      >
        <Typography fontSize={13}>{node.name}</Typography>
      </Paper>
    );
  }

  /* ================= GRID (YARD) ================= */
  if (isGrid(node.type)) {
    return (
      <Paper sx={{ mt: 2, borderRadius: "14px", overflow: "hidden" }}>
        <Box
          onClick={toggle}
          sx={{
            background: "#0f8f83",
            color: "#fff",
            px: 2,
            py: 1.4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: hasChildren ? "pointer" : "default",
          }}
        >
          <Typography fontWeight={600}>{node.name}</Typography>
          {expandBtn}
        </Box>

        <Collapse in={open}>
          <Box
            sx={{
              p: 2,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            {children}
          </Box>
        </Collapse>
      </Paper>
    );
  }

  /* ================= DEFAULT ================= */
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: "18px",
        mb: 2,
        background: "#fff",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
        onClick={toggle}
        sx={{ cursor: hasChildren ? "pointer" : "default" }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          {renderIcon(node.type)}
          <Typography fontWeight={600}>{node.name}</Typography>
        </Box>

        <Box>
          {expandBtn}

          {/* {level === 0 && (
            <IconButton size="small" onClick={(e) => handleDelete(node.location_id)}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          )} */}
        </Box>
      </Box>

      <Collapse in={open}>{children}</Collapse>

      {/* ✅ SINGLE MODAL (FIXED) */}
      {level === 0 && (
        <LocationTreeMainEditDialogue
          open={editOpen}
          onClose={() => setEditOpen(false)}
          node={selectedNode}
          onSave={(updatedNode) => {
            console.log("Updated:", updatedNode);
          }}
        />
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};