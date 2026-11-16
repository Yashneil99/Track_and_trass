// import React from "react";
// import {
//     Box,
//     Typography,
//     Divider,
//     Chip
// } from "@mui/material";
// import PlaceIcon from '@mui/icons-material/Place';
// import InventoryIcon from "@mui/icons-material/Inventory";
// import InfoIcon from "@mui/icons-material/Info";
// import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

// export const SelectedLocationMovement = ({ material }) => {
//     if (!material) return null;

//     const isAvailable = !material.material_code;

//     return (
//         <React.Fragment key={material.code}>
//             {isAvailable ? (
//                 <Box
//                     sx={{
//                         m: 1.2,
//                         p: 2.2,
//                         borderRadius: 2,
//                         background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
//                         border: "1px solid #e3e3e3",
//                         boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
//                         transition: "0.25s",
//                         "&:hover": {
//                             boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
//                             background: "#ffffff",
//                             transform: "translateY(-2px)",
//                         },
//                     }}
//                 >
//                     <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
//                         <PlaceIcon sx={{ color: "#1976d2", fontSize: 20, mr: 1 }} />
//                         <Typography variant="h6" fontWeight={600}>
//                             Location Available
//                         </Typography>
//                     </Box>

//                     <Divider sx={{ my: 1.5 }} />

//                     <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//                         <FiberManualRecordIcon sx={{ fontSize: 10, color: "#888", mt: "6px" }} />
//                         <Typography><strong>Location Code:</strong> {material.code}</Typography>
//                     </Box>

//                     <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//                         <FiberManualRecordIcon sx={{ fontSize: 10, color: "#888", mt: "6px" }} />
//                         <Typography><strong>Location Name:</strong> {material.name}</Typography>
//                     </Box>

//                     <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
//                         <InfoIcon sx={{ fontSize: 18, color: "#444" }} />
//                         <Chip
//                             label="Available"
//                             size="small"
//                             sx={{
//                                 fontWeight: 600,
//                                 color: "#fff",
//                                 background: "linear-gradient(90deg,#A8E063 0%, #56AB2F 100%)",
//                             }}
//                         />
//                     </Box>
//                 </Box>
//             ) : (
//                 <Box
//                     sx={{
//                         m: 1.2,
//                         p: 2.2,
//                         borderRadius: 2,
//                         background: "linear-gradient(to bottom, #ffffff, #f0f0f0)",
//                         border: "1px solid #d9d9d9",
//                         boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
//                         transition: "0.25s",
//                         "&:hover": {
//                             boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
//                             background: "#ffffff",
//                             transform: "translateY(-2px)",
//                         },
//                     }}
//                 >
//                     <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
//                         <PlaceIcon sx={{ color: material?.status === "In Transit" ? "#ebdd1d" : "#d32f2f", fontSize: 20, mr: 1 }} />
//                         <Typography variant="h6" fontWeight={600} color={material?.status === "In Transit" ? "#ebdd1d" : "#d32f2f"}>
//                             Location Occupied
//                         </Typography>
//                     </Box>

//                     <Divider sx={{ my: 1.5 }} />

//                     <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//                         <FiberManualRecordIcon sx={{ fontSize: 10, color: "#888", mt: "6px" }} />
//                         <Typography><strong>Location :</strong> {material.code} - {material.name}</Typography>
//                     </Box>

//                     <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
//                         <InventoryIcon sx={{ fontSize: 18, color: "#444" }} />
//                         <Chip
//                             label={material?.status === "In Transit" ? "Material Incoming" : "Material Present"}
//                             size="small"
//                             sx={{
//                                 fontWeight: 600,
//                                 color: "#fff",
//                                 background: material?.status === "In Transit" ? "linear-gradient(90deg,#ebdd1d 0%, #ebdd1d 100%)" : "linear-gradient(90deg,#D32F2F 0%, #eb3f33 100%)",
//                             }}
//                         />
//                     </Box>

//                     <Box sx={{ pl: 4, mt: 1 }}>
//                         <Typography variant="body2" color="textSecondary">
//                             Material: <strong>{material.material_name}</strong>
//                         </Typography>
//                         <Typography variant="body2" color="textSecondary">
//                             Code: <strong>{material.material_code}</strong>
//                         </Typography>
//                         {material.previous_location ? <Typography variant="body2" color="textSecondary">
//                             Previous Location : <strong>{material.previous_location}</strong>
//                         </Typography> : <Typography variant="body2" color="textSecondary">
//                             Previous Location : <strong>None</strong>
//                         </Typography>}
//                     </Box>
//                 </Box>
//             )}
//             <Divider sx={{ my: 1 }} />
//         </React.Fragment>
//     );
// };


import React from "react";
import {
    Box,
    Typography,
    Divider,
    Chip
} from "@mui/material";

import PlaceIcon from "@mui/icons-material/Place";
import InventoryIcon from "@mui/icons-material/Inventory";
import InfoIcon from "@mui/icons-material/Info";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

import CircularProgressRing from "./occupancyProgress";

export const SelectedLocationMovement = ({ location, materials }) => {
    if (!location) return null;

    const capacity = location?.attributes?.capacity ?? 80;
    const currentLoad = materials?.length ?? 0;
    const availableSlots = capacity - currentLoad;

    const occupancyPercent = (currentLoad / capacity) * 100;

    const isAvailable = currentLoad < capacity;

    return (
        <>
            {isAvailable && (
                <Box
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
                        <PlaceIcon sx={{ color: "#1976d2", fontSize: 20, mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                            Location Available
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 10, color: "#888", mt: "6px" }} />
                        <Typography><strong>Location Code:</strong> {location.code}</Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 10, color: "#888", mt: "6px" }} />
                        <Typography><strong>Location Name:</strong> {location.name}</Typography>
                    </Box>

                    {/* ------------------ OCCUPANCY WITH RING ------------------ */}
                    <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 2 }}>
                        <CircularProgressRing value={occupancyPercent} />

                        <Box>
                            <Typography><strong>Capacity:</strong> {capacity}</Typography>
                            <Typography><strong>Occupied:</strong> {currentLoad}</Typography>
                            <Typography><strong>Available:</strong> {availableSlots}</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                        <InfoIcon sx={{ fontSize: 18, color: "#444" }} />
                        <Chip
                            label="Available"
                            size="small"
                            sx={{
                                fontWeight: 600,
                                color: "#fff",
                                background: "linear-gradient(90deg,#A8E063 0%, #56AB2F 100%)",
                            }}
                        />
                    </Box>

                    {/* ⭐⭐⭐ NEW — SHOW MATERIALS EVEN WHEN AVAILABLE ⭐⭐⭐ */}
                    {materials?.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.5 }} />

                            {materials.map((mat, index) => (
                                <Box key={mat.material_code + index} sx={{ mb: 2, pl: 2 }}>
                                    <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                                        <InventoryIcon sx={{ fontSize: 18, color: "#444" }} />
                                        <Chip
                                            label={mat.status === "In Transit" ? "Material Incoming" : "Material Present"}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                color: "#fff",
                                                background:
                                                    mat.status === "In Transit"
                                                        ? "linear-gradient(90deg,#ebdd1d 0%, #ebdd1d 100%)"
                                                        : "linear-gradient(90deg,#1976d2 0%, #4791db 100%)",
                                            }}
                                        />
                                    </Box>

                                    <Typography variant="body2">
                                        Material: <strong>{mat.material_name}</strong>
                                    </Typography>

                                    <Typography variant="body2" sx={{
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word"
                                    }}>
                                        Code: <strong>{mat.material_code}</strong>
                                    </Typography>

                                    <Typography variant="body2">
                                        Previous Location: <strong>{mat.previous_location || "None"}</strong>
                                    </Typography>

                                    <Divider sx={{ my: 1 }} />
                                </Box>
                            ))}
                        </>
                    )}
                </Box>
            )}

            {/* ---------------------- LOCATION OCCUPIED ---------------------- */}
            {!isAvailable && (
                <Box
                    sx={{
                        m: 1.2,
                        p: 2.2,
                        borderRadius: 2,
                        background: "linear-gradient(to bottom, #ffffff, #f0f0f0)",
                        border: "1px solid #d9d9d9",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        transition: "0.25s",
                        "&:hover": {
                            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                            background: "#ffffff",
                            transform: "translateY(-2px)",
                        },
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <PlaceIcon sx={{ color: "#d32f2f", fontSize: 20, mr: 1 }} />
                        <Typography variant="h6" fontWeight={600} color="#d32f2f">
                            Location Occupied
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Ring also visible here */}
                    <Box sx={{ display: "flex", gap: 2, mt: 1, mb: 2 }}>
                        <CircularProgressRing value={occupancyPercent} />

                        <Box>
                            <Typography><strong>Capacity:</strong> {capacity}</Typography>
                            <Typography><strong>Occupied:</strong> {currentLoad * 10}</Typography>
                            <Typography><strong>Available:</strong> {availableSlots}</Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {materials.map((mat, index) => (
                        <Box key={mat.material_code + index} sx={{ mb: 2, pl: 2 }}>
                            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                                <InventoryIcon sx={{ fontSize: 18, color: "#444" }} />
                                <Chip
                                    label={mat.status === "In Transit" ? "Material Incoming" : "Material Present"}
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        color: "#fff",
                                        background:
                                            mat.status === "In Transit"
                                                ? "linear-gradient(90deg,#ebdd1d 0%, #ebdd1d 100%)"
                                                : "linear-gradient(90deg,#D32F2F 0%, #eb3f33 100%)",
                                    }}
                                />
                            </Box>

                            <Typography variant="body2">
                                Material: <strong>{mat.material_name}</strong>
                            </Typography>

                            <Typography variant="body2" sx={{ overflowWrap: "break-word" }}>
                                Code: <strong>{mat.material_code}</strong>
                            </Typography>

                            <Typography variant="body2">
                                Previous Location: <strong>{mat.previous_location || "None"}</strong>
                            </Typography>

                            <Divider sx={{ my: 1 }} />
                        </Box>
                    ))}
                </Box>
            )}

            <Divider sx={{ my: 1 }} />
        </>
    );
};