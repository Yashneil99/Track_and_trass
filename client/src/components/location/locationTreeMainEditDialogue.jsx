import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Divider,
  Typography,
} from "@mui/material";

import { EditDialogueTree } from "./editDialogueTree";

export const LocationTreeMainEditDialogue = ({ open, onClose, node }) => {
  const [selectedNode, setSelectedNode] = React.useState(null);

  // reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedNode(null);
    }
  }, [open]);

  const handleEditClick = (nodeData) => {
    setSelectedNode(nodeData);
  };

  if (!node) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Location</DialogTitle>

      <DialogContent>
        <Divider sx={{ my: 2 }} />

        {selectedNode !== null && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" mb={3}>
              Selected Node Details
            </Typography>

            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
              {Object.keys(selectedNode)
                .filter((key) => key !== "children")
                .map((key) => (
                  <TextField
                    key={key}
                    label={key.replaceAll("_", " ").toUpperCase()}
                    value={
                      selectedNode[key] === null ? "null" : selectedNode[key]
                    }
                    fullWidth
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* TREE */}
        <Typography variant="subtitle2" mb={3}>
          Location Structure
        </Typography>

        <Box
          sx={{
            maxHeight: "400px",
            overflow: "auto",
            border: "1px solid #eee",
            borderRadius: "10px",
            p: 1,
          }}
        >
          <EditDialogueTree node={node} level={0} onEdit={handleEditClick} />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
