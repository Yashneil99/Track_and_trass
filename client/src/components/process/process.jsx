import React, { useState, useEffect } from "react";
import "./process.css";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProcess,
  updateProcess,
} from "../../features/process/processSlice";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import EditProcess from "./editProcess";

const customTheme = createTheme({
  palette: {
    primary: { main: "#009688" },
    background: { default: "#f6f6f2", paper: "#ffffff" },
    text: { primary: "#212121", secondary: "#616161" },
  },
});

export default function Processing() {
  const dispatch = useDispatch();
  const { list } = useSelector((state) => state.process);

  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleEdit = (row) => {
    setSelectedRow(row);
    setOpen(true);
  };

  useEffect(() => {
    dispatch(fetchProcess());
  }, [dispatch]);

  const handleUpdateProcess = async (payload) => {
    await dispatch(updateProcess(payload));
    await dispatch(fetchProcess());
  };

  const columns = [
    { field: "id", headerName: "Sr no.", flex: 1 },
    { field: "name", headerName: "Name", flex: 2 },
    { field: "description", headerName: "Description", flex: 3 },
    { field: "input_material_types", headerName: "Input Types", flex: 2 },
    { field: "output_material_types", headerName: "Output Types", flex: 2 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton onClick={() => handleEdit(params.row)}>
          <EditIcon color="primary" />
        </IconButton>
      ),
    },
  ];

  
  const parseArrayField = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;

    return value
      .replace(/[{}"]/g, "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  } catch {
    return value
      .replace(/[{}"]/g, "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
};


 const rows = list?.map((item, index) => ({
  id: index + 1,
  process_id: item.process_id,
  name: item.name,
  description: item.description,

  input_material_types: parseArrayField(item.input_material_types).join(", "),
  output_material_types: parseArrayField(item.output_material_types).join(", "),
}));


  return (
    <ThemeProvider theme={customTheme}>
      <Box sx={{ width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 20]}
        />
      </Box>

      <EditProcess
        open={open}
        onClose={() => setOpen(false)}
        selectedRow={selectedRow}
        onSave={handleUpdateProcess}
      />
    </ThemeProvider>
  );
}
