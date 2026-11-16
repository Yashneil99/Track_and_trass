// import React, { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export const renderTree = (node, depth = 0,locations,openNodes) => {
    const isExpandable = node.children?.length > 0;
    const isOpen = openNodes[node.id];

      const handleRemoveLocation = (id) => {
        const removeRecursive = (nodes) =>
            nodes
                .filter((node) => node.id !== id)
                .map((n) => ({ ...n, children: removeRecursive(n.children) }));

        setLocations(removeRecursive(locations));
    };

    return (
        <Box key={node.id} sx={{ ml: depth * 2, py: 0.5 }}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                    borderLeft: "2px solid #ccc",
                    pl: 1,
                    cursor: isExpandable ? "pointer" : "default",
                }}
                onClick={() => isExpandable && toggleNode(node.id)}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    {isExpandable ? (
                        isOpen ? (
                            <ExpandMoreIcon fontSize="16px" />
                        ) : (
                            <ChevronRightIcon fontSize="16px" />
                        )
                    ) : (
                        <Box sx={{ width: 16 }} />
                    )}

                    <Typography fontSize={14}>
                        <b>{node.name}</b>{" "}
                        <span style={{ color: "#666" }}>({node.type})</span>
                        {node.stack && (
                            <span
                                style={{
                                    fontSize: 11,
                                    marginLeft: 6,
                                    color: "#999",
                                }}
                            >
                                [{node.stack}]
                            </span>
                        )}
                    </Typography>
                </Box>

                {node.id !== "root" && (
                    <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLocation(node.id);
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {isExpandable && isOpen && (
                <Box>
                    {node.children.map((child) =>
                        renderTree(child, depth + 1)
                    )}
                </Box>
            )}
        </Box>
    );
};