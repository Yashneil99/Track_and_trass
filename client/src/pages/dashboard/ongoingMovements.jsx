// import React, { useState } from "react";
// import {
//     Box,
//     Typography,
//     Divider
// } from "@mui/material";
// import PlaceIcon from '@mui/icons-material/Place';
// import InventoryIcon from "@mui/icons-material/Inventory";
// import AccessTimeIcon from "@mui/icons-material/AccessTime";
// import InfoIcon from "@mui/icons-material/Info";
// import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
// import { Chip } from "@mui/material";

// const statusColor = (status) => {
//     if (status === 'In Transit') return "#FFF9C4";
//     if (status === 'Moved') return "#4caf50";
//     return "#d32f2f";
// };

// export const RenderLocations = ({ nodes, depth = 0 }) => {
//     if (!nodes) return null;

//     return nodes.map((node) => {
//         const show = node.status === 'In Transit';

//         return (
//             <React.Fragment key={node.code}>
//                 {show && (
//                     <Box
//                         sx={{
//                             m: 1.2,
//                             p: 2.2,
//                             borderRadius: 2,
//                             background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
//                             border: "1px solid #e3e3e3",
//                             boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
//                             transition: "0.25s",
//                             "&:hover": {
//                                 boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
//                                 background: "#ffffff",
//                                 transform: "translateY(-2px)",
//                             },
//                         }}
//                     >
//                         <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
//                             <InventoryIcon sx={{ color: "#1976d2", fontSize: 18, mr: 1 }} />
//                             <Typography variant="h7" fontWeight={600}>
//                                 {node.material_name || "Material"}
//                             </Typography>
//                         </Box>

//                         <Divider sx={{ my: 1.5 }} />

//                         <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//                             <FiberManualRecordIcon
//                                 sx={{ fontSize: 12, color: "#888", mt: "6px" }}
//                             />
//                             <Typography><strong>Code:</strong> {node.material_code}</Typography>
//                         </Box>

//                         <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//                             <FiberManualRecordIcon
//                                 sx={{ fontSize: 12, color: "#888", mt: "6px" }}
//                             />
//                             <Typography><strong>Quantity:</strong> {node.quantity}</Typography>
//                         </Box>

//                         <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//                             <AccessTimeIcon sx={{ fontSize: 18, color: "#444" }} />
//                             <Typography>
//                                 <strong>Last Moved:</strong>{" "}
//                                 {node.latest_moved_at
//                                     ? new Date(node.latest_moved_at).toLocaleString()
//                                     : "N/A"}
//                             </Typography>
//                         </Box>

//                         <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
//                             <InfoIcon sx={{ fontSize: 18, color: "#444" }} />
//                             <Chip
//                                 label={node.status}
//                                 size="small"
//                                 sx={{
//                                     fontWeight: 600,
//                                     color: "#423d3d",
//                                     backgroundColor: statusColor(node.status)
//                                 }}
//                             />
//                         </Box>

//                         {(
//                             <Box sx={{ display: "flex", gap: 1 }}>
//                                 <PlaceIcon sx={{ fontSize: 18, color: "#444" }} />
//                                 <Typography>
//                                     <strong>Current Location:</strong> {node.code} - {node.name}
//                                 </Typography>
//                             </Box>
//                         )}

//                         {node.previous_location && (
//                             <Box sx={{ display: "flex", gap: 1 }}>
//                                 <PlaceIcon sx={{ fontSize: 18, color: "#444" }} />
//                                 <Typography>
//                                     <strong>Previous Location:</strong> {node.previous_location}
//                                 </Typography>
//                             </Box>
//                         )}
//                     </Box>
//                 )}
//                 {node.children && node.children.length > 0 && (
//                     <RenderLocations nodes={node.children} depth={depth + 1} />
//                 )}
//             </React.Fragment>
//         );
//     });
// };

import React from "react";
import {
    Box,
    Typography,
    Divider,
    Chip
} from "@mui/material";

import PlaceIcon from '@mui/icons-material/Place';
import InventoryIcon from "@mui/icons-material/Inventory";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import InfoIcon from "@mui/icons-material/Info";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

const statusColor = (status) => {
    if (status === "In Transit") return "#FFF9C4";
    if (status === "Moved") return "#4caf50";
    return "#d32f2f";
};

export const RenderLocations = ({ nodes, depth = 0 }) => {
    if (!nodes) return null;

    return nodes.map((node) => {
        return (
            <React.Fragment key={node.code}>
                {node.materials && node.materials.length > 0 &&
                    node.materials.map((mat, index) => (
                        mat.status === "In Transit" && (
                            <Box
                                key={mat.material_code + index}
                                sx={{
                                    m: 1.2,
                                    p: 2.2,
                                    borderRadius: 2,
                                    background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
                                    border: "1px solid #e3e3e3",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                    transition: "0.25s",
                                    "&:hover": {
                                        boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                                        background: "#ffffff",
                                        transform: "translateY(-2px)",
                                    },
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                                    <InventoryIcon sx={{ color: "#1976d2", fontSize: 18, mr: 1 }} />
                                    <Typography variant="h7" fontWeight={600}>
                                        {mat.material_name}
                                    </Typography>
                                </Box>
                                <Divider sx={{ my: 1.5 }} />
                                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                                    <FiberManualRecordIcon sx={{ fontSize: 12, color: "#888", mt: "6px", }} />
                                    <Typography sx={{
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word"
                                    }}><strong>Code:</strong> {mat.material_code}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                                    <FiberManualRecordIcon sx={{ fontSize: 12, color: "#888", mt: "6px" }} />
                                    <Typography><strong>Quantity:</strong> {mat.quantity}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                                    <AccessTimeIcon sx={{ fontSize: 18, color: "#444" }} />
                                    <Typography>
                                        <strong>Last Moved:</strong>{" "}
                                        {mat.latest_moved_at
                                            ? new Date(mat.latest_moved_at).toLocaleString()
                                            : "N/A"}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                                    <InfoIcon sx={{ fontSize: 18, color: "#444" }} />
                                    <Chip
                                        label={mat.status}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            color: "#423d3d",
                                            backgroundColor: statusColor(mat.status),
                                        }}
                                    />
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <PlaceIcon sx={{ fontSize: 18, color: "#444" }} />
                                    <Typography>
                                        <strong>Current Location:</strong> {node.code} - {node.name}
                                    </Typography>
                                </Box>
                                {mat.previous_location && (
                                    <Box sx={{ display: "flex", gap: 1 }}>
                                        <PlaceIcon sx={{ fontSize: 18, color: "#444" }} />
                                        <Typography>
                                            <strong>Previous Location:</strong> {mat.previous_location}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )
                    ))
                }
                {node.children && node.children.length > 0 && (
                    <RenderLocations nodes={node.children} depth={depth + 1} />
                )}
            </React.Fragment>
        );
    });
};