import React, { useState } from "react";
import {
    Box,
    Typography,
    Collapse,
    List,
    ListItemButton,
    ListItemText,
} from "@mui/material";
import {
    ExpandLess,
    ExpandMore,
    LocationCity,
    Apartment,
    Layers,
    MeetingRoom,
} from "@mui/icons-material";
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FactoryIcon from '@mui/icons-material/Factory';
import FenceIcon from '@mui/icons-material/Fence';
import PlaceIcon from '@mui/icons-material/Place';

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

export const TreeView = ({ node, depth = 0 }) => {
    const [open, setOpen] = useState(false);
    const hasChildren = node?.children?.length > 0;

    const handleClick = () => {
        if (hasChildren) setOpen((prev) => !prev);
    };

    return (
        <>
            <ListItemButton
                onClick={handleClick}
                sx={{
                    pl: depth * 3,
                    py: 1,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    transition: "all 0.2s ease",
                    bgcolor: open ? "#F7F7FF" : "transparent",
                    "&:hover": {
                        bgcolor: "#F0F0FF",
                        transform: "scale(1.01)",
                    },
                    position: "relative",
                }}
            >
                {depth > 0 && (
                    <Box
                        sx={{
                            position: "absolute",
                            left: (depth * 24) - 18,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            bgcolor: "#E0E0E0", ml: 2
                        }}
                    />
                )}
                <Box sx={{ width: 24, display: "flex", justifyContent: "center", ml: 2 }}>
                    {hasChildren && (open ? <ExpandLess sx={{ fontSize: 28 }} /> : <ExpandMore sx={{ fontSize: 28 }} />)}
                </Box>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        bgcolor: hasChildren ? "#E8EAF6" : "#FFF3E0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {hasChildren
                        ? typeIcons[node.type] || typeIcons.folder
                        : typeIcons[node.type] || typeIcons.file}
                </Box>
                <ListItemText
                    primary={
                        <Typography fontWeight={600} fontSize={14}>
                            {node?.name}
                        </Typography>
                    }
                    secondary={
                        node.type && (
                            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                {node?.type}
                            </Typography>
                        )
                    }
                />
            </ListItemButton>
            {hasChildren && (
                <Collapse in={open} timeout={200} unmountOnExit>
                    <List disablePadding>
                        {node?.children?.map((child) => (
                            <TreeView key={child.code} node={child} depth={depth + 1} />
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
}; 