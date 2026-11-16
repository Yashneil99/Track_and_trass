import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Skeleton, Chip, Alert,
} from "@mui/material";
import {
  DeleteForeverOutlined, DescriptionOutlined, VisibilityOutlined,
} from "@mui/icons-material";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DataObjectIcon from '@mui/icons-material/DataObject';
import SummarizeIcon from '@mui/icons-material/Summarize';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import { useDispatch, useSelector } from "react-redux";
import {
  deleteSTNDocument,
  extractSTNDocument,
  fetchSTNDocuments,
  consolidateSTN,
  assignSTNLocation,
  releaseSTNLocation,
  clearAllocationResult,
  clearExtractedResult,
} from "../../features/stn/stnslice";

// Stacked icon+label button style (colleague's STN Documents restyle). Pass a
// background + text colour; omit both for the plain error (Delete) button.
const labelBtnSx = (backgroundColor, color) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "2px",
  minWidth: "60px",
  height: "60px",
  borderRadius: "12px",
  boxShadow: "none",
  textTransform: "none",
  ...(backgroundColor ? { backgroundColor } : {}),
  ...(color ? { color } : {}),
  "&:hover": { backgroundColor: "#bbf7d0", boxShadow: "none" },
});

const STNDocumentsView = () => {
  const dispatch = useDispatch();
  const { loading, documents = [], extractedData, allocationLoading, allocationError, lastAllocationResult, error } = useSelector((state) => state.stn);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [viewMode, setViewMode] = useState(null); // 'summary' or 'extracted'

  // Task 1: Auto Allocation of Bags on STN Upload
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'assign' | 'release', doc }
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [activeInvoiceStn, setActiveInvoiceStn] = useState(null);

  useEffect(() => {
    dispatch(fetchSTNDocuments());
  }, [dispatch]);

  const handleViewDocument = (doc) => {
    window.open(`${process.env.REACT_APP_API_URL}${doc.file_path}`, "_blank");
  };

  // Delete releases the STN's bins on the way out, and the backend refuses
  // outright once bags have been submitted — so the outcome has to be shown.
  // Swallowing it made a refusal look identical to a successful delete.
  const handleDeleteDocument = async (id) => {
    if (!window.confirm("Delete this STN? Its reserved bins will be released and its allocation data removed.")) return;

    const outcome = await dispatch(deleteSTNDocument(id));
    if (deleteSTNDocument.rejected.match(outcome)) {
      window.alert(outcome.error?.message || "Failed to delete STN");
      return;
    }
    dispatch(fetchSTNDocuments());
  };

  const handleExtractData = async (invoiceSTN) => {
    setSelectedFile(invoiceSTN);
    setSummary(null);
    setExtractLoading(true);
    setViewMode('extracted');
    await dispatch(clearExtractedResult());
    await dispatch(extractSTNDocument(invoiceSTN));
    setExtractLoading(false);
    setOpenDialog(true);
  };

  const showSummary = (doc) => {
    setSelectedFile(doc.file_name);
    setSummary(doc.summary);
    setViewMode('summary');
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setViewMode(null);
    setSummary(null);
  };

  // Assign/Release reserve or free bin capacity, so both ask for
  // confirmation before running (accessibility requirement in the spec).
  const requestAssignLocation = (doc) => setConfirmAction({ type: "assign", doc });
  const requestReleaseLocation = (doc) => setConfirmAction({ type: "release", doc });

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, doc } = confirmAction;
    setConfirmAction(null);
    setActiveInvoiceStn(doc.invoice_stn);
    dispatch(clearAllocationResult());

    if (type === "assign") {
      // The web app has no separate "Consolidate" step in this view, so
      // Assign consolidates (dedupe by Garden Invoice, sum bags) and then
      // runs the first-fit allocation in one click, per the spec.
      const consolidateOutcome = await dispatch(consolidateSTN(doc.invoice_stn));
      if (consolidateSTN.rejected.match(consolidateOutcome)) {
        setResultDialogOpen(true);
        return;
      }
      await dispatch(assignSTNLocation(doc.invoice_stn));
    } else {
      await dispatch(releaseSTNLocation(doc.invoice_stn));
    }
    setResultDialogOpen(true);
  };

  const handleCloseResultDialog = () => {
    setResultDialogOpen(false);
    dispatch(clearAllocationResult());
    setActiveInvoiceStn(null);
  };

  return (
    <>
      <Box>
        <Typography variant="h5" fontWeight={700}>Uploaded Files</Typography>
        <Typography variant="body2" color="text.secondary" mb={3} mt={0.5}>View and manage your documents</Typography>

        <Box display="flex" flexDirection="column" gap={2} sx={{ overflowY: "auto", maxHeight: 520, pr: 0.5 }}>
          {loading ? (
            <Skeleton variant="rounded" height={320} />
          ) : Array.isArray(documents) && documents.length > 0 ? (
            documents.map((doc) => (
              <Paper key={doc.document_id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "14px", p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{doc.file_name || "Processing..."}</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>STN No.: {doc.invoice_stn || "Generating..."}</Typography>
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {/* Labeled buttons (colleague's restyle). labelBtnSx keeps the
                        stacked icon+text look identical across all of them. */}
                    <Button variant="contained" onClick={() => handleViewDocument(doc)} sx={labelBtnSx("#dbeafe", "#2563eb")}>
                      <CloudDownloadIcon sx={{ fontSize: "20px" }} />
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>View File</span>
                    </Button>
                    <Button variant="contained" onClick={() => handleExtractData(doc.invoice_stn)} sx={labelBtnSx("#dcfce7", "#16a34a")}>
                      <DataObjectIcon sx={{ fontSize: "20px" }} />
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>STN Info</span>
                    </Button>
                    <Button variant="contained" onClick={() => showSummary(doc)} sx={labelBtnSx("#dcfce7", "#16a34a")}>
                      <SummarizeIcon sx={{ fontSize: "20px" }} />
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>Summary</span>
                    </Button>
                    <Button variant="contained" onClick={() => requestAssignLocation(doc)} title="Assign Location" sx={labelBtnSx("#ede9fe", "#7c3aed")}>
                      <Inventory2OutlinedIcon sx={{ fontSize: "20px" }} />
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>Assign Bin</span>
                    </Button>
                    <Button variant="contained" onClick={() => requestReleaseLocation(doc)} title="Release Location" sx={labelBtnSx("#fef3c7", "#b45309")}>
                      <AssignmentReturnOutlinedIcon sx={{ fontSize: "20px" }} />
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>Release Bin</span>
                    </Button>
                    <Button variant="contained" color="error" onClick={() => handleDeleteDocument(doc.document_id)} sx={labelBtnSx()}>
                      <DeleteForeverOutlined sx={{ fontSize: "20px" }} />
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>Delete STN</span>
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))
          ) : (
            <Box sx={{ border: "1px solid #e5e7eb", borderRadius: "20px", minHeight: "320px", backgroundColor: "#fafafa", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <DescriptionOutlined sx={{ fontSize: 80, color: "#cbd5e1", mb: 2 }} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>No files uploaded yet</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {viewMode === 'summary' ? "Document Summary" : `Extracted Data — ${selectedFile}`}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "75vh" }}>
          {extractLoading ? (
            <><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /></>
          ) : viewMode === 'summary' ? (
            <Box>
              {Array.isArray(summary) ? summary.map((item, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  {Object.entries(item).map(([k, v]) => (
                    <Typography key={k} variant="body2" sx={{ mb: 0.5 }}><strong>{k}:</strong> {String(v)}</Typography>
                  ))}
                </Paper>
              )) : <Typography>No summary available.</Typography>}
            </Box>
          ) : viewMode === 'extracted' && extractedData && Array.isArray(extractedData) && extractedData.length > 0 ? (
            <TableContainer component={Paper} elevation={1}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {Object.keys(extractedData[0]).map((h) => <TableCell key={h} sx={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {extractedData.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, idx) => <TableCell key={idx}>{String(val)}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>{error || "No data found."}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Task 1: Auto Allocation of Bags on STN Upload — confirm before running */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmAction?.type === "assign" ? "Assign Location?" : "Release Location?"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {confirmAction?.type === "assign"
              ? `This reserves bin capacity for every invoice in STN ${confirmAction?.doc?.invoice_stn}, using the first bin (in code order) that fits each invoice.`
              : `This returns the unsubmitted portion of bags in STN ${confirmAction?.doc?.invoice_stn} back to their bins. Any invoice already fully submitted is left untouched.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button onClick={handleConfirmAction} variant="contained" color={confirmAction?.type === "assign" ? "primary" : "warning"}>
            {confirmAction?.type === "assign" ? "Assign Location" : "Release Location"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task 1: Auto Allocation of Bags on STN Upload — assign/release result */}
      <Dialog open={resultDialogOpen} onClose={handleCloseResultDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {lastAllocationResult?.action === "assign" ? "Assign Location — Result" : "Release Location — Result"}
        </DialogTitle>
        <DialogContent dividers>
          {allocationLoading ? (
            <><Skeleton height={40} /><Skeleton height={40} /></>
          ) : allocationError ? (
            <Alert severity="error">{allocationError}</Alert>
          ) : lastAllocationResult?.action === "assign" ? (
            <Box>
              {Array.isArray(lastAllocationResult?.data?.successful) && lastAllocationResult.data.successful.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Allocated</Typography>
                  {lastAllocationResult.data.successful.map((row) => (
                    <Box key={row.allocation_id} sx={{ mb: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{row.garden_invoice} · {row.total_bags} bags</Typography>
                        {row.allocated_location === "SPLIT" ? (
                          <Chip label="Split across bins" color="info" size="small" />
                        ) : (
                          <Chip label={`Bin ${row.allocated_location}${row.manual ? " (manual)" : ""}`} color="success" size="small" />
                        )}
                      </Box>
                      {row.allocated_location === "SPLIT" && Array.isArray(row.splits) && (
                        <Box sx={{ mt: 0.5, ml: 1 }}>
                          {row.splits.map((split) => (
                            <Typography key={split.code} variant="caption" color="text.secondary" display="block">
                              · Bin {split.code}: {split.bags} bags
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </>
              )}
              {/* Read-only by design: the client accepts that a full warehouse
                  leaves bags unplaced, so this only reports them. No manual bin
                  picker — auto-allocation (single bin, else split across bins)
                  is the only way an invoice gets a location. */}
              {Array.isArray(lastAllocationResult?.data?.failed) && lastAllocationResult.data.failed.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }} color="error">
                    No space available — these bags could not be assigned
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    {lastAllocationResult.data.failed.length} invoice(s) ·{" "}
                    {lastAllocationResult.data.failed.reduce((sum, r) => sum + (r.requested || 0), 0)} bags
                    could not be placed. Free up bin space and run Assign Bin again.
                  </Alert>
                  {lastAllocationResult.data.failed.map((row) => (
                    <Box key={row.allocation_id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">{row.garden_invoice} · {row.requested} bags</Typography>
                      <Chip label="No space" color="error" variant="outlined" size="small" />
                    </Box>
                  ))}
                </>
              )}
              {(!lastAllocationResult?.data?.successful || lastAllocationResult.data.successful.length === 0) &&
                (!lastAllocationResult?.data?.failed || lastAllocationResult.data.failed.length === 0) && (
                  <Typography variant="body2" color="text.secondary">{lastAllocationResult?.message || "Nothing to allocate."}</Typography>
              )}
            </Box>
          ) : lastAllocationResult?.action === "release" ? (
            <Box>
              {Array.isArray(lastAllocationResult?.data?.released) && lastAllocationResult.data.released.length > 0 ? (
                lastAllocationResult.data.released.map((row) => (
                  <Box key={row.allocation_id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {row.garden_invoice} · released {row.released_qty} bags from{" "}
                      {row.allocated_location === "SPLIT" && Array.isArray(row.splits)
                        ? `Bins ${row.splits.join(", ")}`
                        : `Bin ${row.allocated_location}`}
                    </Typography>
                    <Chip label={row.location_cleared ? "Cleared" : "Retained (partial)"} color={row.location_cleared ? "default" : "warning"} size="small" />
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">{lastAllocationResult?.message || "Nothing to release."}</Typography>
              )}
            </Box>
          ) : (
            <Typography>No result to show.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResultDialog} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default STNDocumentsView;
