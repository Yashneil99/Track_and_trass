import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MaterialCard from "./materialCard";
import {
  fetchMaterials,
  updateMaterial,
} from "../../features/material/materialSlice";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import {
  Alert,
  Card,
  CardContent,
  Chip,
  Snackbar,
  Typography,
} from "@mui/material";
import "../dashboard/dashboard.css";
import { IconButton } from "@mui/material";
import { Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import MaterialForm from "./../admin/materialForm";
import Edit from "@mui/icons-material/ModeEditOutlineOutlined";
import Visibility from "@mui/icons-material/RemoveRedEyeOutlined";
import MaterialInformation from "./MaterialInformation";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import DoneIcon from "@mui/icons-material/Done";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
} from "@mui/material";
import { clearMaterialError } from "../../features/material/materialSlice";
import { TableVirtuoso } from "react-virtuoso";

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilized = array.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

const MaterialComp = ({}) => {
  const dispatch = useDispatch();
  const { data: materials, status } = useSelector((state) => state.material);

  const [searchQuery, setSearchQuery] = useState("");
  const [rfidQuery, setRfidQuery] = useState("");
const [invQuery, setInvQuery] = useState("");

  // Sorting states
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");

  // Dialog states
  const [openAdd, setOpenAdd] = useState(false);
  const [openView, setOpenView] = useState(false);

  // Selected material for view/edit
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showActions, setShowActions] = useState(true);
  const [openSnack, setOpenSnack] = useState(false);
  const [snackSeverity, setSnackSeverity] = useState("success");
  const [snackMsg, setSnackMsg] = useState("");

  useEffect(() => {
    dispatch(fetchMaterials());
  }, [dispatch]);

  // Handlers
  const handleOpenAdd = () => setOpenAdd(true);
  const handleCloseAdd = () => setOpenAdd(false);

  const handleOpenViewMaterial = (material, isEdit) => {
    setSelectedMaterial(material);
    setShowActions(isEdit);
    setOpenView(true);
  };

  const handleOpenEditMaterial = (material, isEdit) => {
    setSelectedMaterial(material);
    setShowActions(isEdit);
    setOpenView(true);
  };

  const handleCloseView = () => setOpenView(false);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Filtering and Sorting logic
  // const filteredMaterials = stableSort(
  //   materials.filter(
  //     (item) =>
  //       item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //       (item.code &&
  //         item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
  //       (item.attributes?.["Garden Inv No"] &&
  //         String(item.attributes["Garden Inv No"])
  //           .toLowerCase()
  //           .includes(searchQuery.toLowerCase())),
  //   ),
  //   getComparator(order, orderBy),
  // );
  const lowerRfidQuery = rfidQuery.toLowerCase();
const lowerInvQuery = invQuery.toLowerCase();

const filteredMaterials = stableSort(
  materials.filter((item) => {
    // 1. Check if it matches the RFID/Name query (if one is typed)
    const matchesRfid =
      rfidQuery === "" ||
      (item.name && item.name.toLowerCase().includes(lowerRfidQuery)) ||
      (item.code && item.code.toLowerCase().includes(lowerRfidQuery));

    // 2. Check if it matches the Invoice Number query (if one is typed)
    const matchesInv =
      invQuery === "" ||
      (item.attributes?.["Garden Inv No"] &&
        String(item.attributes["Garden Inv No"]).toLowerCase().includes(lowerInvQuery));

    // Only return the item if it matches BOTH conditions
    return matchesRfid && matchesInv;
  }),
  getComparator(order, orderBy)
);

  const handleSaveMaterial = async (updatedMaterial) => {
    const resultAction = await dispatch(updateMaterial(updatedMaterial));
    if (updateMaterial.fulfilled.match(resultAction)) {
      setOpenSnack(true);
      setSnackSeverity("success");
      setSnackMsg(resultAction?.payload?.message);
      dispatch(fetchMaterials());
      setOpenView(false);
    } else {
      alert("Update failed: " + resultAction.payload);
    }
  };

  const onSuccess = (msg) => {
    setSnackMsg(msg);
    setSnackSeverity("success");
    setOpenSnack(true);
    handleCloseAdd();
    dispatch(fetchMaterials());
  };

  const onError = (msg) => {
    setSnackMsg(msg);
    setSnackSeverity("error");
    setOpenSnack(true);
  };

  const activeMaterials = materials.filter(
    (row) => row.status === "active",
  ).length;

  const inactiveMaterials = materials.filter(
    (row) => row.status === "inactive",
  ).length;

  return (
    <>
      {status === "failed" && <p>Error fetching materials</p>}

      {status === "succeeded" && (
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            flexGrow: 1,
          }}
        >
          {/* ===== Section 1: Top Bar ===== */}
          {/* <Box
            className="fade-up3 section-1"
            sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
          >
            <Button
              className="fade-up3 section-2"
              variant="contained"
              startIcon={<Add sx={{ color: "white" }} />}
              sx={{
                backgroundColor: "#009689",
                color: "white",
                textTransform: "none",
                borderRadius: "10px",
                "&:hover": {
                  backgroundColor: "#00796b",
                  transform: "scale(1.05)",
                },
              }}
              onClick={handleOpenAdd}
            >
              Add Materials
            </Button>
            <TextField
              className="fade-up3 section-2"
              variant="outlined"
              size="small"
              placeholder="Search.. RFID_STN No"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: "#009688",
                  },
                },
                "& .MuiInputLabel-root": {
                  "&.Mui-focused": {
                    color: "#009688",
                  },
                },
              }}
            />

            <TextField
              className="fade-up3 section-2"
              variant="outlined"
              size="small"
              placeholder="Search.. Inv.No"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": {
                    borderColor: "#009688",
                  },
                },
                "& .MuiInputLabel-root": {
                  "&.Mui-focused": {
                    color: "#009688",
                  },
                },
              }}
            />
          </Box> */}
          <Box
  className="fade-up3 section-1"
  sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
>
  {/* Left Side: Add Button */}
  <Button
    className="fade-up3 section-2"
    variant="contained"
    startIcon={<Add sx={{ color: "white" }} />}
    sx={{
      backgroundColor: "#009689",
      color: "white",
      textTransform: "none",
      borderRadius: "10px",
      "&:hover": {
        backgroundColor: "#00796b",
        transform: "scale(1.05)",
      },
    }}
    onClick={handleOpenAdd}
  >
    Add Materials
  </Button>

  {/* Right Side: Grouped Search Inputs */}
  <Box sx={{ display: "flex", gap: 2 }}>
    <TextField
      className="fade-up3 section-2"
      variant="outlined"
      size="small"
      placeholder="Search.. RFID_STN No"
      value={rfidQuery}
      onChange={(e) => setRfidQuery(e.target.value)}
      sx={{
        "& .MuiOutlinedInput-root": {
          "&.Mui-focused fieldset": { borderColor: "#009688" },
        },
        "& .MuiInputLabel-root": {
          "&.Mui-focused": { color: "#009688" },
        },
      }}
    />

    <TextField
      className="fade-up3 section-2"
      variant="outlined"
      size="small"
      placeholder="Search.. Inv.No"
      value={invQuery}
      onChange={(e) => setInvQuery(e.target.value)}
      sx={{
        "& .MuiOutlinedInput-root": {
          "&.Mui-focused fieldset": { borderColor: "#009688" },
        },
        "& .MuiInputLabel-root": {
          "&.Mui-focused": { color: "#009688" },
        },
      }}
    />
  </Box>
</Box>

          <Box className="stats-grids fade-in-up section-3">
            <Card className="stats-cards">
              <CardContent className="stats-contents orange-borders">
                <Box>
                  <Typography variant="body2">Total Materials</Typography>
                  <Typography variant="h4" fontWeight="600" color="#000000">
                    {materials?.length || 0}
                  </Typography>
                </Box>
                <Box className="icon-boxs icon-oranges">
                  <Inventory2Icon sx={{ color: "#f97316" }} />
                </Box>
              </CardContent>
            </Card>

            <Card className="stats-cards">
              <CardContent className="stats-contents green-borders">
                <Box>
                  <Typography variant="body2">Active Materials</Typography>
                  <Typography variant="h4" fontWeight="600" color="#000000">
                    {activeMaterials}
                  </Typography>
                </Box>
                <Box className="icon-boxs icon-greens">
                  <DoneIcon sx={{ color: "#16a34a" }} />
                </Box>
              </CardContent>
            </Card>

            <Card className="stats-cards">
              <CardContent className="stats-contents violet-borders">
                <Box>
                  <Typography variant="body2">Inactive Materials</Typography>
                  <Typography variant="h4" fontWeight="600" color="#000000">
                    {inactiveMaterials}
                  </Typography>
                </Box>
                <Box className="icon-boxs icon-violets">
                  <LocalShippingIcon sx={{ color: "#A32BFB" }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* ===== Section 3: Dialog ===== */}
          <Dialog
            open={openAdd}
            onClose={handleCloseAdd}
            fullWidth
            maxWidth="md"
            PaperProps={{
              className: "fade-up section-3",
              sx: {
                borderRadius: 3,
                overflow: "hidden",
              },
            }}
          >
            <DialogTitle
              sx={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "20px",
                py: 1.5,
                backgroundColor: "#e0f2f1",
                borderBottom: "2px solid #009688",
                position: "relative",
                color: "#009689",
              }}
            >
              Add Bag Details
              <IconButton
                onClick={handleCloseAdd}
                sx={{ position: "absolute", right: 10, top: 10 }}
              />
            </DialogTitle>

            <DialogContent sx={{ mt: 1 }}>
              <MaterialForm
                onSuccess={(msg) => onSuccess(msg)}
                onError={(msg) => onError(msg)}
              />
            </DialogContent>
          </Dialog>

          {/* ===== Section 4: Table ===== */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <TableContainer
              className="fade-up3 section-4"
              component={Paper}
              sx={{
                border: "1px solid #ddd",
                boxShadow: 2,
                borderRadius: "15px",
                height: "100vh", // ⭐ INCREASED HEIGHT TO 100VH HERE
                overflow: "hidden", // Allows Virtuoso to scroll internally
              }}
            >
              <TableVirtuoso
                data={filteredMaterials}
                computeItemKey={(index, item) => item.material_id || index}
                components={{
                  Table: (props) => <Table {...props} />,
                  TableHead: TableHead,
                  TableRow: (props) => (
                    <TableRow
                      {...props}
                      sx={{
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        "&:hover": {
                          transform: "scale(1.02)",
                          backgroundColor: "#f2fffa",
                        },
                      }}
                    />
                  ),
                  TableBody: React.forwardRef((props, ref) => (
                    <TableBody {...props} ref={ref} />
                  )),
                }}
                fixedHeaderContent={() => (
                  <TableRow
                    sx={{
                      background: "linear-gradient(135deg, #0D9488, #14B8A6)",
                    }}
                  >
                    {[
                      { id: "name", label: "RFID_STN No" },
                      { id: "attributes", label: "Bag Details" },
                      { id: "uom", label: "UOM" },
                      { id: "status", label: "Status" },
                    ].map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        sx={{ fontWeight: 550, color: "#fff" }}
                      >
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : "asc"}
                          onClick={() => handleRequestSort(headCell.id)}
                          sx={{
                            color: "#fff !important",
                            "& .MuiTableSortLabel-icon": {
                              color: "#fff !important",
                            },
                          }}
                        >
                          {headCell.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 550, color: "#fff" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                )}
                itemContent={(index, item) => (
                  <React.Fragment>
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        fontSize: "15px",
                        fontFamily: "Arial",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.name}
                    </TableCell>
                    <TableCell>
                      {Object.entries(item.attributes || {}).map(
                        ([key, value]) => (
                          <Chip
                            key={key}
                            size="small"
                            label={`${key}: ${value}`}
                            sx={{ m: 0.25 }}
                          />
                        ),
                      )}
                    </TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>
                      <span className={`status-box ${item.status}`}>
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        sx={{ color: "oklch(0.6 0.12 184.7 / 1)" }}
                        onClick={() => handleOpenEditMaterial(item, true)}
                      >
                        <Edit sx={{ fontSize: 17 }} />
                      </IconButton>
                      <IconButton
                        sx={{ color: "oklch(0.6 0.12 184.7 / 1)" }}
                        onClick={() => handleOpenViewMaterial(item, false)}
                      >
                        <Visibility sx={{ fontSize: 17 }} />
                      </IconButton>
                    </TableCell>
                  </React.Fragment>
                )}
              />
            </TableContainer>
          </Box>

          <Dialog
            open={openView}
            onClose={handleCloseView}
            maxWidth="md"
            fullWidth
          >
            <MaterialInformation
              open={openView}
              handleClose={handleCloseView}
              selectedMaterial={selectedMaterial}
              onSave={handleSaveMaterial}
              showActions={showActions}
            />
          </Dialog>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            open={openSnack}
            autoHideDuration={4500}
            onClose={() => {
              setOpenSnack(false);
              dispatch(clearMaterialError());
            }}
          >
            <Alert severity={snackSeverity} sx={{ width: "100%" }}>
              {snackMsg}
            </Alert>
          </Snackbar>
        </CardContent>
      )}
    </>
  );
};

export default MaterialComp;
