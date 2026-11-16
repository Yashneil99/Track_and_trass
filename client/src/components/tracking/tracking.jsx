import React, { useEffect, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import "./tracking.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMaterialMovement,
  fetchMaterialRoutingHistoryTillDate,
} from "../../features/materialMovement/materialMovementSlice";
import { fetchMaterials } from "../../features/material/materialSlice";
import { Autocomplete, TextField, Modal, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DynamicFlow from "./dynamicFlow.js";
import { Typography } from "@mui/material";
import { Card, CardContent } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import DoneIcon from "@mui/icons-material/Done";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MovementForm from "../admin/movementForm.jsx";
import { TableVirtuoso } from "react-virtuoso";

const customTheme = createTheme({
  palette: {
    primary: { main: "#009688" },
    background: { default: "#f6f6f2", paper: "#ffffff" },
    text: { primary: "#212121", secondary: "#616161" },
  },
});

export default function DataGridDemo() {
  const dispatch = useDispatch();
  const { data, routingHistory } = useSelector(
    (state) => state.materialMovement,
  );

  const { data: materials } = useSelector((state) => state.material);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 50,
  });

  const [open, setOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const flattenMaterials = (materials) =>
    materials.map((mat) => ({
      ...mat,
      displayName: `${mat.name} - ${mat.code}`,
      group: mat.name,
    }));

  const materialOptions = flattenMaterials(materials || []);

  useEffect(() => {
    dispatch(fetchMaterialMovement());
    dispatch(fetchMaterials());
  }, [dispatch]);

  const handleClose = (value) => {
    setOpenMovementDialog(value);
  };

  const columns = [
    { field: "id", headerName: "Sr no.", flex: 0.5 },
    { field: "movementId", headerName: "Movement ID", flex: 1 },
    { field: "location", headerName: "Location", flex: 1 },
    { field: "quantity", headerName: "Quantity", flex: 1 },
    { field: "material", headerName: "Material", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "purpose", headerName: "Purpose", flex: 1 },
    { field: "movedBy", headerName: "Moved By", flex: 1 },
    { field: "movedAt", headerName: "Moved At", flex: 1 },
  ];

  const rows = data.map((item, index) => ({
    id: index + 1,
    movementId: item.movement_id,
    location: item.location
      ? `${item.location} (${item.location_code || "N/A"})`
      : "Outward",
    quantity: item.quantity,
    material: item.material || "N/A",
    status: item.status || "N/A",
    purpose: item.purpose || "N/A",
    movedBy: item.moved_by,
    movedAt: new Date(item.moved_at).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "numeric",
      minute: "numeric",
    }),
  }));

  const inTransitCount = rows.filter(
    (row) => row.status === "In Transit",
  ).length;
  const movedCount = rows.filter((row) => row.status === "Moved").length;
  const uniqueMovements = new Set(rows.map((row) => row.movementId)).size;
  const [openMovementDialog, setOpenMovementDialog] = useState(false);

  return (
    <ThemeProvider theme={customTheme}>
      <Box className="stats-grid">
        <Card className="stats-card fade-in-up1" style={{ animationDelay: "0.2s" }}>
          <CardContent className="stats-content">
            <Box>
              <Typography variant="body2">Total Movements</Typography>
              <Typography variant="h4" fontWeight="600" color="#000000">
                {uniqueMovements}
              </Typography>
            </Box>
            <Box className="icon-box icon-orange">
              <Inventory2Icon sx={{ color: "#f97316" }} />
            </Box>
          </CardContent>
        </Card>

        <Card className="stats-card fade-in-up1" style={{ animationDelay: "0.4s" }}>
          <CardContent className="stats-content">
            <Box>
              <Typography variant="body2">In Transit</Typography>
              <Typography variant="h4" fontWeight="600" color="#000000">
                {inTransitCount}
              </Typography>
            </Box>
            <Box className="icon-box icon-violet">
              <LocalShippingIcon sx={{ color: "#1637a3" }} />
            </Box>
          </CardContent>
        </Card>

        <Card className="stats-card fade-in-up1" style={{ animationDelay: "0.6s" }}>
          <CardContent className="stats-content">
            <Box>
              <Typography variant="body2">Completed</Typography>
              <Typography variant="h4" fontWeight="600" color="#000000">
                {movedCount}
              </Typography>
            </Box>
            <Box className="icon-box icon-green">
              <DoneIcon sx={{ color: "#16a34a" }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* TABLE SECTION */}
      <Box
        style={{ animationDelay: "1s" }}
        sx={{
          width: "100%",
          height: "100vh",
          margin: 0,
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          style={{ animationDelay: "1.2s" }}
          sx={{
            width: "100%",
            height: "100vh",
            margin: 0,
            padding: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER BAR */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "8px 12px", sm: "12px 24px" },
              borderBottom: "1px solid #ffffff",
              backgroundColor: "#ffffff",
              flexShrink: 0,
              flexWrap: { xs: "wrap", sm: "nowrap" },
              gap: { xs: 1, sm: 0 },
              borderTopLeftRadius: "15px",
              borderTopRightRadius: "15px",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                px: 0,
                fontSize: "18px",
                borderRadius: "3px",
              }}
            >
              Tracking Details
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                width: { xs: "100%", sm: "auto" },
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenMovementDialog(true)}
                sx={{
                  textTransform: "none",
                  borderRadius: "10px",
                  backgroundColor: "#009688",
                  "&:hover": {
                    backgroundColor: "#00796b",
                  },
                }}
              >
                Material Movement
              </Button>

              <Autocomplete
                sx={{ width: { xs: "100%", sm: 300 } }}
                options={materialOptions}
                groupBy={(option) => option?.group}
                getOptionLabel={(option) => option.displayName || ""}
                onChange={async (e, value) => {
                  if (value) {
                    setSelectedMaterial(value.displayName);
                    await dispatch(
                      fetchMaterialRoutingHistoryTillDate(value.name),
                    );
                    setOpen(true);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Select Material" size="small" />
                )}
              />
            </Box>
          </Box>

          {/* VIRTUALIZED TABLE CONTAINER */}
          <Box
            style={{ animationDelay: "1.5s" }}
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <Paper
              sx={{
                flex: 1,
                borderBottomLeftRadius: "20px",
                borderBottomRightRadius: "20px",
                overflow: "hidden",
              }}
            >
              <TableVirtuoso
                data={rows}
                components={{
                  Table: (props) => (
                    <Table {...props} sx={{ borderCollapse: "collapse" }} />
                  ),
                  TableHead: TableHead,
                  TableRow: (props) => (
                    <TableRow {...props} className="fade-in-up" />
                  ),
                  TableBody: React.forwardRef((props, ref) => (
                    <TableBody {...props} ref={ref} />
                  )),
                }}
                fixedHeaderContent={() => (
                  <TableRow sx={{ backgroundColor: "#ffffff" }}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.field}
                        sx={{
                          fontWeight: 600,
                          color: "#000",
                          backgroundColor: "#F9FAFB",
                          fontSize: "14px",
                        }}
                      >
                        {col.headerName}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
                itemContent={(index, row) => (
                  <React.Fragment>
                    {columns.map((col) => {
                      if (col.field === "status") {
                        const isInTransit = row[col.field] === "In Transit";
                        const isMoved = row[col.field] === "Moved";

                        return (
                          <TableCell
                            key={col.field}
                            sx={{ borderBottom: "1px solid #F3F4F6" }}
                          >
                            <Box
                              sx={{
                                display: "inline-block",
                                borderRadius: "50px",
                                minWidth: 100,
                                padding: "4px 12px 4px 20px",
                                lineHeight: "20px",
                                fontSize: "13px",
                                fontWeight: 500,
                                textAlign: "center",
                                position: "relative",
                                border: 1,
                                borderColor: isInTransit
                                  ? "#60A5FA"
                                  : isMoved
                                  ? "#22C55E"
                                  : "#FACC15",
                                backgroundColor: isInTransit
                                  ? "#DBEAFE"
                                  : isMoved
                                  ? "#DCFCE7"
                                  : "#FEF9C2",
                                color: isInTransit
                                  ? "oklch(48.8% .243 264.376);"
                                  : isMoved
                                  ? "oklch(52.7% .154 150.069);"
                                  : "#92400E",
                                "&::before": {
                                  content: '""',
                                  position: "absolute",
                                  left: "13px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  backgroundColor: isInTransit
                                    ? "#1D4ED8"
                                    : isMoved
                                    ? "#166534"
                                    : "#FACC15",
                                },
                              }}
                            >
                              {row[col.field]}
                            </Box>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={col.field}
                          sx={{
                            borderBottom: "1px solid #F3F4F6",
                            color:
                              col.field === "movementId"
                                ? "oklch(54.6% .245 262.881)"
                                : "inherit",
                            fontWeight: 500,
                          }}
                        >
                          {row[col.field]}
                        </TableCell>
                      );
                    })}
                  </React.Fragment>
                )}
              />
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* MODALS */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "white",
            borderRadius: "12px",
            boxShadow: 24,
            width: "95vw",
            height: "85vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <IconButton
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              right: 10,
              top: 10,
              zIndex: 10,
              bgcolor: "#f0f0f0",
              "&:hover": { bgcolor: "#e0e0e0" },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, padding: 2 }}>
            {routingHistory.length > 0 && (
              <DynamicFlow
                movement={routingHistory}
                selectedMaterial={selectedMaterial}
                fullScreen
              />
            )}
          </Box>
        </Box>
      </Modal>

      <Dialog
        open={openMovementDialog}
        onClose={() => setOpenMovementDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 500,
            fontSize: "20px",
            py: 1.5,
            backgroundColor: "#e0f2f1",
            borderBottom: "2px solid #009688",
            position: "relative",
            color: "#009689",
          }}
        >
          Material Movement
          <IconButton
            aria-label="close"
            onClick={() => setOpenMovementDialog(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#009689",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <MovementForm
            onClose={() => {
              setOpenMovementDialog(false);
              dispatch(fetchMaterialMovement()); // refresh the table after add
            }}
          />
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}