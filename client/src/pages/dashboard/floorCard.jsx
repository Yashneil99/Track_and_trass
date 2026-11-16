// import React, { useState } from "react";
// import {
//     Box,
//     Card,
//     Typography,
//     Tooltip,
// } from "@mui/material";
// import { motion } from "framer-motion";

// export const FloorCard = ({ node, currentCode, previousCode, handleClick }) => {
//     const isOccupied = !!node.material_code && node.quantity > 0;
//     const isCurrent = node.code === currentCode;
//     const isPrevious = node.code === previousCode;

//     const STATUS_COLORS = {
//         Moved: "#A5D6A7",
//         "In Transit": "#FFF9C4",
//         empty: "#FFEBEE",
//     };

//     const cardColor = isOccupied
//         ? STATUS_COLORS[node.status] || "#C8E6C9"
//         : STATUS_COLORS["empty"];

//     const motionProps =
//         node.status === "In Transit"
//             ? {
//                 animate: { x: [0, 4, -4, 0] },
//                 transition: { duration: 0.6, repeat: Infinity },
//             }
//             : {};

//     const shouldBlink =
//         node.status === "In Transit" && node.code === previousCode;

//     return (
//         <>
//             <Tooltip
//                 title={
//                     isOccupied ? (
//                         <Box>
//                             <div><strong>{node.material_name}</strong></div>
//                             <div>Code: {node.material_code}</div>
//                             <div>Qty: {node.quantity}</div>
//                             <div>Status: {node.status}</div>
//                         </Box>
//                     ) : "No material"
//                 }
//                 arrow
//             >
//                 <motion.div {...motionProps}>
//                     <Card
//                         onClick={() => handleClick(node)}
//                         sx={{
//                             p: 1,
//                             cursor: isOccupied ? "pointer" : "default",
//                             borderRadius: 2,
//                             border: "1px solid #BDBDBD",
//                             backgroundColor: cardColor,
//                             transition: "0.2s",
//                             position: "relative",
//                             "&:hover": {
//                                 backgroundColor: isOccupied ? "#B2DDB3" : "#FFCDD2",
//                             },
//                         }}
//                     >
//                         <Typography fontWeight={700}>{node.name}</Typography>
//                         {shouldBlink && <Box className="blink-dot" />}
//                     </Card>
//                 </motion.div>
//             </Tooltip>
//         </>
//     );
// };


// ---- working code -----
// import React from "react";
// import { Box, Card, Typography, Tooltip } from "@mui/material";
// import { motion } from "framer-motion";

// export const FloorCard = ({ node, currentCode, previousCode, handleClick }) => {
//     const capacity = node?.attributes?.capacity ?? 80;
//     const materialsCount = node?.materials?.length ?? 0;
//     const occupancyPercent = Math.min(
//         Math.round((materialsCount / capacity) * 100),
//         100
//     );

//     const STATUS_COLORS = {
//         Moved: "#A5D6A7",
//         "In Transit": "#FFF9C4",
//         empty: "#FFEBEE",
//     };

//     const cardColor = (() => {
//         if (materialsCount === 0) {
//             return STATUS_COLORS.empty;
//         }

//         if (materialsCount >= capacity) {
//             return "#A5D6A7"; // full = green
//         }

//         if (node.status === "In Transit") {
//             return STATUS_COLORS["In Transit"];
//         }

//         return "#e2e6c8"; // partially filled
//     })();

//     const isPrevious = node.code === previousCode;
//     const motionProps =
//         node.status === "In Transit"
//             ? {
//                 animate: { x: [0, 4, -4, 0] },
//                 transition: { duration: 0.6, repeat: Infinity },
//             }
//             : {};

//     const shouldBlink = node.status === "In Transit" && isPrevious;

//     return (
//         <Tooltip
//             title={
//                 materialsCount > 0 ? (
//                     <Box>
//                         {node.materials.map((m, index) => (
//                             <Box key={index} mb={1}>
//                                 <div><strong>{m.material_name}</strong></div>
//                                 <div>Code: {m.material_code}</div>
//                                 <div>Qty: {m.quantity}</div>
//                                 <div>Status: {m.status}</div>
//                                 {index !== node.materials.length - 1 && <hr />}
//                             </Box>
//                         ))}
//                     </Box>
//                 ) : (
//                     "No material"
//                 )
//             }
//             arrow
//         >
//             <motion.div {...motionProps}>
//                 <Card
//                     onClick={() => handleClick(node)}
//                     sx={{
//                         p: 1.5,
//                         cursor: "pointer",
//                         borderRadius: 2,
//                         border: "1px solid #BDBDBD",
//                         backgroundColor: cardColor,
//                         transition: "0.2s",
//                         minHeight: 110,
//                         position: "relative",
//                         "&:hover": {
//                             backgroundColor:
//                                 materialsCount > 0 ? "#B2DDB3" : "#FFCDD2",
//                         },
//                     }}
//                 >
//                     <Typography fontWeight={700} mb={1}>
//                         {node.name}
//                     </Typography>
//                     <Box
//                         sx={{
//                             position: "absolute",
//                             top: 8,
//                             right: 8,
//                             width: 48,
//                             height: 48,
//                         }}
//                     >
//                         <svg width="48" height="48" viewBox="0 0 36 36">
//                             {/* Background Circle */}
//                             <path
//                                 d="M18 2 
//                                 a 16 16 0 1 1 0 32 
//                                 a 16 16 0 1 1 0 -32"
//                                 fill="none"
//                                 stroke="#eee"
//                                 strokeWidth="3.5"
//                             />

//                             {/* Progress Circle */}
//                             <path
//                                 d="M18 2 
//                                 a 16 16 0 1 1 0 32 
//                                 a 16 16 0 1 1 0 -32"
//                                 fill="none"
//                                 stroke="#4caf50"
//                                 strokeWidth="3.5"
//                                 strokeDasharray={`${occupancyPercent}, 100`}
//                                 transform="rotate(-90 18 18)"
//                                 style={{
//                                     transition: "stroke-dasharray 0.6s ease",
//                                 }}
//                             />
//                         </svg>

//                         {/* Center Text */}
//                         <Box
//                             sx={{
//                                 position: "absolute",
//                                 top: "50%",
//                                 left: "50%",
//                                 transform: "translate(-50%, -50%)",
//                                 fontSize: 10,
//                                 fontWeight: "bold",
//                             }}
//                         >
//                             {materialsCount}/{capacity}
//                         </Box>
//                     </Box>

//                     {/* Blinking Dot */}
//                     {shouldBlink && (
//                         <Box
//                             sx={{
//                                 width: 12,
//                                 height: 12,
//                                 borderRadius: "50%",
//                                 background: "red",
//                                 position: "absolute",
//                                 top: 8,
//                                 left: 8,
//                                 animation: "blink 0.8s infinite",
//                             }}
//                         />
//                     )}
//                 </Card>
//             </motion.div>
//         </Tooltip>
//     );
// };


import React from "react";
import { Box, Card, Typography, Tooltip } from "@mui/material";
import { motion } from "framer-motion";

export const FloorCard = ({ node, currentCode, previousCode, handleClick }) => {
    const capacity = node?.attributes?.capacity ?? 80;
    const materialsCount = node?.materials?.length ?? 0;
    const occupancyPercent = Math.min(
        Math.round((materialsCount / capacity) * 100),
        100
    );

    const STATUS_COLORS = {
        Moved: "#A5D6A7",
        "In Transit": "#FFF9C4",
        empty: "#FFEBEE",
    };

    const cardColor = (() => {
        if (materialsCount === 0) {
            return STATUS_COLORS.empty;
        }

        if (materialsCount >= capacity) {
            return "#A5D6A7"; // full = green
        }

        if (node.status === "In Transit") {
            return STATUS_COLORS["In Transit"];
        }

        return "#e2e6c8"; // partially filled
    })();

    const isPrevious = node.code === previousCode;
    const motionProps =
        node.status === "In Transit"
            ? {
                animate: { x: [0, 4, -4, 0] },
                transition: { duration: 0.6, repeat: Infinity },
            }
            : {};

    const shouldBlink = node.status === "In Transit" && isPrevious;

    return (
        <Tooltip
            title={
                materialsCount > 0 ? (
                    /* ADDED: Max height, scrolling, and custom scrollbar styles here */
                    <Box 
                        sx={{ 
                            maxHeight: 200, 
                            overflowY: "auto", 
                            pr: 0.5, // Padding right so text doesn't hide behind the scrollbar
                            "&::-webkit-scrollbar": {
                                width: "4px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                backgroundColor: "rgba(255, 255, 255, 0.3)",
                                borderRadius: "4px",
                            },
                        }}
                    >
                        {node.materials.map((m, index) => (
                            <Box key={index} mb={1}>
                                <div><strong>{m.material_name}</strong></div>
                                <div>Code: {m.material_code}</div>
                                <div>Qty: {m.quantity}</div>
                                <div>Status: {m.status}</div>
                                {index !== node.materials.length - 1 && <hr style={{ borderColor: "rgba(255,255,255,0.2)" }} />}
                            </Box>
                        ))}
                    </Box>
                ) : (
                    "No material"
                )
            }
            arrow
            /* OPTIONAL: Allows interactive elements or text selection inside the tooltip */
            componentsProps={{
                tooltip: {
                    sx: {
                        pointerEvents: "auto", 
                    },
                },
            }}
        >
            <motion.div {...motionProps}>
                <Card
                    onClick={() => handleClick(node)}
                    sx={{
                        p: 1.5,
                        cursor: "pointer",
                        borderRadius: 2,
                        border: "1px solid #BDBDBD",
                        backgroundColor: cardColor,
                        transition: "0.2s",
                        minHeight: 110,
                        position: "relative",
                        "&:hover": {
                            backgroundColor:
                                materialsCount > 0 ? "#B2DDB3" : "#FFCDD2",
                        },
                    }}
                >
                    <Typography fontWeight={700} mb={1}>
                        {node.name}
                    </Typography>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 48,
                            height: 48,
                        }}
                    >
                        <svg width="48" height="48" viewBox="0 0 36 36">
                            <path
                                d="M18 2 
                                a 16 16 0 1 1 0 32 
                                a 16 16 0 1 1 0 -32"
                                fill="none"
                                stroke="#eee"
                                strokeWidth="3.5"
                            />
                            <path
                                d="M18 2 
                                a 16 16 0 1 1 0 32 
                                a 16 16 0 1 1 0 -32"
                                fill="none"
                                stroke="#4caf50"
                                strokeWidth="3.5"
                                strokeDasharray={`${occupancyPercent}, 100`}
                                transform="rotate(-90 18 18)"
                                style={{
                                    transition: "stroke-dasharray 0.6s ease",
                                }}
                            />
                        </svg>

                        <Box
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                fontSize: 10,
                                fontWeight: "bold",
                                width: "100%",
                                textAlign: "center"
                            }}
                        >
                            {materialsCount}/{capacity}
                        </Box>
                    </Box>

                    {/* Blinking Dot */}
                    {shouldBlink && (
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: "red",
                                position: "absolute",
                                top: 8,
                                left: 8,
                                animation: "blink 0.8s infinite",
                            }}
                        />
                    )}
                </Card>
            </motion.div>
        </Tooltip>
    );
};

