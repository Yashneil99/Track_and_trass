// import React from "react";
// import {
//   Box,
//   Typography,
//   IconButton,
// } from "@mui/material";
// import DeleteIcon from "@mui/icons-material/Delete";
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import ChevronRightIcon from "@mui/icons-material/ChevronRight";
// import { useTreeState } from "../../hooks/useTreeState";

// export function LocationTree({ locations, onRemoveLocation }) {
//   const { openNodes, toggleNode, isNodeOpen } = useTreeState();

//   const renderTree = (node, depth = 0) => {
//     const isExpandable = node.children?.length > 0;
//     const isOpen = isNodeOpen(node.code);

//     return (
//       <Box key={node.code} sx={{ ml: depth * 2, py: 0.5 }}>
//         <Box
//           display="flex"
//           justifyContent="space-between"
//           alignItems="center"
//           sx={{
//             borderLeft: "2px solid #ccc",
//             pl: 1,
//             cursor: isExpandable ? "pointer" : "default",
//           }}
//           onClick={() => isExpandable && toggleNode(node.code)}
//         >
//           {/* LEFT */}
//           <Box display="flex" alignItems="center" gap={1}>
//             {isExpandable ? (
//               isOpen ? (
//                 <ExpandMoreIcon fontSize="small" />
//               ) : (
//                 <ChevronRightIcon fontSize="small" />
//               )
//             ) : (
//               <Box sx={{ width: 16 }} />
//             )}

//             <Typography fontSize={14}>
//               <b>{node.name}</b>{" "}
//               <span style={{ color: "#666" }}>({node.type})</span>

//               {node.stack && (
//                 <span
//                   style={{
//                     fontSize: 11,
//                     marginLeft: 6,
//                     color: "#999",
//                   }}
//                 >
//                   [{node.stack}]
//                 </span>
//               )}
//             </Typography>
//           </Box>

//           {/* DELETE BUTTON */}
//           {node.code !== "ROOT" && (
//             <IconButton
//               size="small"
//               color="error"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onRemoveLocation(node.code);
//               }}
//             >
//               <DeleteIcon fontSize="small" />
//             </IconButton>
//           )}
//         </Box>

//         {/* CHILDREN */}
//         {isExpandable && isOpen && (
//           <Box>
//             {node.children?.map((child) =>
//               renderTree(child, depth + 1)
//             )}
//           </Box>
//         )}
//       </Box>
//     );
//   };

//   return <Box>{locations?.map((node) => renderTree(node))}</Box>;
// }

import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  alpha,
} from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import { useTreeState } from "../../hooks/useTreeState";

export function LocationTree({ locations, onRemoveLocation, onEditLocation }) {
  const { openNodes, toggleNode, isNodeOpen } = useTreeState();

  const renderTree = (node, depth = 0) => {
    const isExpandable = node.children && node.children.length > 0;
    const isOpen = isNodeOpen(node.code);

    return (
      <Box key={node.code} sx={{ ml: depth ? 2.5 : 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => isExpandable && toggleNode(node.code)}
          sx={{
            py: 0.75,
            px: 1,
            borderRadius: 1,
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderLeft: depth > 0 ? "1px dashed" : "1px solid",
            borderColor: "divider",
            "&:hover": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
              "& .tree-actions": { opacity: 1 }, // Show action items on row hover
            },
          }}
        >
          {/* NODE METADATA */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {isExpandable ? (
              <IconButton 
                size="small" 
                sx={{ p: 0.25, color: "text.secondary" }}
              >
                {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            ) : (
              <Box sx={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "text.disabled" }} />
              </Box>
            )}

            {/* Icon type changes visually based on hierarchy structure */}
            {isExpandable ? (
              <FolderIcon fontSize="small" sx={{ color: "warning.main", opacity: 0.8 }} />
            ) : (
              <LocationOnIcon fontSize="small" sx={{ color: "primary.main", opacity: 0.8 }} />
            )}

            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={0.75}>
              <Typography variant="body2" fontWeight="600" color="text.primary">
                {node.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                • {node.type}
              </Typography>
              {node.stack && (
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.1,
                    borderRadius: 0.5,
                    backgroundColor: "action.selected",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight="500" sx={{ fontSize: "10px" }}>
                    {node.stack}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>

          {/* ACTIONS WRAPPER */}
          <Stack 
            direction="row" 
            spacing={0.5} 
            className="tree-actions"
            sx={{ 
              opacity: { xs: 1, md: 0 }, // Always show on mobile, fade-in on hover for desktop
              transition: "opacity 0.15s ease",
            }}
            onClick={(e) => e.stopPropagation()} // Stop tree folding/expanding toggle actions
          >
            {/* EDIT NODE ACTION */}
            {onEditLocation && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => onEditLocation(node)}
                sx={{ p: 0.5 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}

            {/* DELETE NODE ACTION */}
            {node.code !== "ROOT" && (
              <IconButton
                size="small"
                color="error"
                onClick={() => onRemoveLocation(node.code)}
                sx={{ p: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* NESTED TREE CHILDREN */}
        {isExpandable && isOpen && (
          <Box sx={{ mt: 0.25 }}>
            {node.children.map((child) => renderTree(child, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  // Safe validation fallback handle wrapper loop array check
  const treeData = Array.isArray(locations) ? locations : locations ? [locations] : [];

  return (
    <Stack spacing={0.5} sx={{ width: "100%", py: 1 }}>
      {treeData.map((node) => renderTree(node))}
    </Stack>
  );
}