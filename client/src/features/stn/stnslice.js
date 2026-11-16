import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  deleteDocument,
  extractDocument,
  getDocuments,
  uploadFile,
  consolidateStn,
  assignLocation,
  releaseLocation,
  manualAssignLocation,
} from "./stnservice";

export const fetchSTNDocuments = createAsyncThunk(
  "stn/fetchDocuments",
  async () => {
    const response = await getDocuments();
    return response.data;
  },
);

export const uploadSTNFile = createAsyncThunk(
  "stn/uploadSTNFile",
  async ({ file, invoiceSTN }) => {
    const response = await uploadFile(file, invoiceSTN);
    return response.data;
  },
);

export const deleteSTNDocument = createAsyncThunk(
  "stn/deleteDocument",
  async (documentId) => {
    const response = await deleteDocument(documentId);
    return response.data;
  },
);

export const extractSTNDocument = createAsyncThunk(
  "stn/extractDocument",
  async (invoiceSTN) => {
    const response = await extractDocument(invoiceSTN);
    return response.data;
  },
);

// Task 1: Auto Allocation of Bags on STN Upload

export const consolidateSTN = createAsyncThunk(
  "stn/consolidate",
  async (invoiceSTN, { rejectWithValue }) => {
    try {
      const response = await consolidateStn(invoiceSTN);
      return { invoiceSTN, ...response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const assignSTNLocation = createAsyncThunk(
  "stn/assignLocation",
  async (invoiceSTN, { rejectWithValue }) => {
    try {
      const response = await assignLocation(invoiceSTN);
      return { invoiceSTN, ...response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const releaseSTNLocation = createAsyncThunk(
  "stn/releaseLocation",
  async (invoiceSTN, { rejectWithValue }) => {
    try {
      const response = await releaseLocation(invoiceSTN);
      return { invoiceSTN, ...response.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Manual location assignment for a single invoice row that auto-allocation
// couldn't place. Takes the whole {invoiceSTN, gardenInvoice, location} so the
// UI can patch just that one row into lastAllocationResult afterwards.
export const manualAssignSTNLocation = createAsyncThunk(
  "stn/manualAssignLocation",
  async (
    { invoiceSTN, gardenInvoice, location, force = false },
    { rejectWithValue },
  ) => {
    try {
      const response = await manualAssignLocation(
        invoiceSTN,
        gardenInvoice,
        location,
        force,
      );
      const body = response.data || {};

      if (body.status && body.status !== 200) {
        // Carry status/data through so the component can tell "insufficient
        // capacity, offer to override" apart from every other failure.
        return rejectWithValue({
          message: body.message,
          data: body.data,
          status: body.status,
        });
      }

      return { invoiceSTN, gardenInvoice, location, ...body };
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  },
);

const stnSlice = createSlice({
  name: "stn",
  initialState: {
    documents: [],
    extractedData: [],
    loading: false,
    error: null,
    uploadMessage: null,
    // Task 1: Auto Allocation of Bags on STN Upload
    allocationLoading: false,
    allocationError: null,
    lastAllocationResult: null, // { invoiceSTN, action: 'consolidate'|'assign'|'release', ... }
    manualAssignError: null,
  },
  reducers: {
    clearUploadMessage: (state) => {
      state.uploadMessage = null;
    },
    clearAllocationResult: (state) => {
      state.lastAllocationResult = null;
      state.allocationError = null;
      state.manualAssignError = null;
    },
    clearManualAssignError: (state) => {
      state.manualAssignError = null;
    },
    clearExtractedResult: (state) => {
      state.extractedData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSTNDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSTNDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload;
      })
      .addCase(fetchSTNDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(uploadSTNFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadSTNFile.fulfilled, (state, action) => {
        state.loading = false;
        state.documents.push(action.payload);
        state.uploadMessage = "File uploaded successfully!";
      })
      .addCase(uploadSTNFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(deleteSTNDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSTNDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = state.documents.filter(
          (doc) => doc.id !== action.payload.id,
        );
      })
      .addCase(deleteSTNDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(extractSTNDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(extractSTNDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.extractedData = action.payload.data;
      })
      .addCase(extractSTNDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Task 1: Auto Allocation of Bags on STN Upload
      .addCase(consolidateSTN.pending, (state) => {
        state.allocationLoading = true;
        state.allocationError = null;
      })
      .addCase(consolidateSTN.fulfilled, (state, action) => {
        state.allocationLoading = false;
        state.lastAllocationResult = {
          action: "consolidate",
          ...action.payload,
        };
      })
      .addCase(consolidateSTN.rejected, (state, action) => {
        state.allocationLoading = false;
        state.allocationError = action.payload || action.error.message;
      })
      .addCase(assignSTNLocation.pending, (state) => {
        state.allocationLoading = true;
        state.allocationError = null;
      })
      .addCase(assignSTNLocation.fulfilled, (state, action) => {
        state.allocationLoading = false;
        state.lastAllocationResult = { action: "assign", ...action.payload };
      })
      .addCase(assignSTNLocation.rejected, (state, action) => {
        state.allocationLoading = false;
        state.allocationError = action.payload || action.error.message;
      })
      .addCase(releaseSTNLocation.pending, (state) => {
        state.allocationLoading = true;
        state.allocationError = null;
      })
      .addCase(releaseSTNLocation.fulfilled, (state, action) => {
        state.allocationLoading = false;
        state.lastAllocationResult = { action: "release", ...action.payload };
      })
      .addCase(releaseSTNLocation.rejected, (state, action) => {
        state.allocationLoading = false;
        state.allocationError = action.payload || action.error.message;
      })
      .addCase(manualAssignSTNLocation.pending, (state) => {
        state.manualAssignError = null;
      })
      .addCase(manualAssignSTNLocation.fulfilled, (state, action) => {
        const { gardenInvoice, location, data } = action.payload;
        if (state.lastAllocationResult?.data) {
          const { failed = [], successful = [] } =
            state.lastAllocationResult.data;
          const failedIdx = failed.findIndex(
            (row) => row.garden_invoice === gardenInvoice,
          );
          if (failedIdx !== -1) {
            const [removed] = failed.splice(failedIdx, 1);
            successful.push({
              allocation_id: data?.allocation_id || removed.allocation_id,
              garden_invoice: gardenInvoice,
              total_bags: data?.total_bags ?? removed.requested,
              allocated_location: data?.allocated_location || location,
              manual: true,
            });
          }
        }
      })
      .addCase(manualAssignSTNLocation.rejected, (state, action) => {
        // Insufficient capacity isn't a hard failure — the component offers
        // an "assign anyway?" override for it instead of showing this alert.
        if (!action.payload?.data?.insufficientCapacity) {
          state.manualAssignError =
            action.payload?.message || action.error.message;
        }
      });
  },
});

export const {
  clearUploadMessage,
  clearAllocationResult,
  clearManualAssignError,
  clearExtractedResult,
} = stnSlice.actions;
export default stnSlice.reducer;
