import React, { useState } from "react";
import {
  Box,
  Typography,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  LocationCity,
  Apartment,
  Layers,
  MeetingRoom,
} from "@mui/icons-material";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import FactoryIcon from "@mui/icons-material/Factory";
import FenceIcon from "@mui/icons-material/Fence";
import PlaceIcon from "@mui/icons-material/Place";
import EditIcon from "@mui/icons-material/Edit";

const typeIcons = {
  campus: <LocationCity fontSize="small" />,
  plant: <FactoryIcon fontSize="small" />,
  warehouse: <WarehouseIcon fontSize="small" />,
  yard: <FenceIcon fontSize="small" />,
  slot: <PlaceIcon fontSize="small" />,
  building: <Apartment fontSize="small" />,
  floor: <Layers fontSize="small" />,
  room: <MeetingRoom fontSize="small" />,
};

export const EditDialogueTree = ({ node, level = 0, onEdit }) => {
  const [open, setOpen] = useState(level === 0);
  const hasChildren = node?.children?.length > 0;

  const handleClick = () => {
    if (hasChildren) setOpen((prev) => !prev);
  };

  if (!node) return null;

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        sx={{
          pl: level * 3,
          py: 1,
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all 0.2s ease",
          bgcolor: open ? "#F7F7FF" : "transparent",
          "&:hover": {
            bgcolor: "#F0F0FF",
          },
          position: "relative",
        }}
      >
        {/* LEFT SIDE */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          {/* Vertical line */}
          {level > 0 && (
            <Box
              sx={{
                position: "absolute",
                left: level * 24 - 18,
                top: 0,
                bottom: 0,
                width: 2,
                bgcolor: "#E0E0E0",
              }}
            />
          )}

          {/* Expand icon */}
          <Box sx={{ width: 24, display: "flex", justifyContent: "center" }}>
            {hasChildren &&
              (open ? <ExpandLess /> : <ExpandMore />)}
          </Box>

          {/* Type icon */}
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "8px",
              bgcolor: hasChildren ? "#E8EAF6" : "#FFF3E0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {typeIcons[node.type] || <LocationCity fontSize="small" />}
          </Box>

          {/* Text */}
          <ListItemText
            primary={
              <Typography fontWeight={600} fontSize={14}>
                {node?.name}
              </Typography>
            }
            secondary={
              node?.type && (
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  {node?.type}
                </Typography>
              )
            }
          />
        </Box>

        {/* RIGHT SIDE (Edit Button) */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation(); // prevents expand/collapse
            if (onEdit) onEdit(node);
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </ListItemButton>

      {/* CHILDREN */}
      {hasChildren && (
        <Collapse in={open} timeout={200} unmountOnExit>
          <List disablePadding>
            {node.children.map((child) => (
              <EditDialogueTree
                key={child.code}
                node={child}
                level={level + 1}
                onEdit={onEdit}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};