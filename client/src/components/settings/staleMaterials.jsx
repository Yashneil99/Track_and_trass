import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStaleMaterials, deleteStaleMaterial } from '../../features/material/materialSlice';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  IconButton,
} from '@mui/material';
import { DeleteOutline } from "@mui/icons-material";
import { InventoryOutlined } from '@mui/icons-material';

const StaleMaterials = () => {
  const dispatch = useDispatch();
  const { loading, data = [], error } = useSelector((state) => state.material);

  useEffect(() => {
    dispatch(fetchStaleMaterials());
  }, [dispatch]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      await dispatch(deleteStaleMaterial(id));
      await dispatch(fetchStaleMaterials())
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Stale Materials
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        List of materials that have no movement records.
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={400} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data.length > 0 ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "14px" }}>
          <Table>
            <TableHead sx={{ backgroundColor: "#f9fafb" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Bag Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.code || "General"}</TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1.5, py: 0.5, borderRadius: "8px",
                        backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: 600
                      }}
                    >
                      Inactive
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(item.material_id)} // Pass the unique identifier
                      aria-label="delete"
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box
          display="flex" flexDirection="column" alignItems="center" justifyContent="center"
          sx={{ border: "1px dashed #cbd5e1", borderRadius: "20px", py: 8, backgroundColor: "#fafafa" }}
        >
          <InventoryOutlined sx={{ fontSize: 60, color: "#cbd5e1", mb: 2 }} />
          <Typography color="text.secondary">No stale materials found.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default StaleMaterials;