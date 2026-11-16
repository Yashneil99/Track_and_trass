import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as processService from "./processService";

// FETCH ALL PROCESS
export const fetchProcess = createAsyncThunk(
  "process/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await processService.getAllProcess();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch process"
      );
    }
  }
);

// CREATE PROCESS
export const createProcess = createAsyncThunk(
  "process/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await processService.createNewProcess(payload);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create process"
      );
    }
  }
);

// UPDATE PROCESS  ✅ NEW
export const updateProcess = createAsyncThunk(
  "process/update",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await processService.updateProcess(payload);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update process"
      );
    }
  }
);

const processSlice = createSlice({
  name: "process",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    lastCreated: null,
    lastUpdated: null,   // NEW
  },

  reducers: {
    clearProcessError: (state) => {
      state.error = null;
    },
    resetProcessStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.lastCreated = null;
      state.lastUpdated = null;
    },
  },

  extraReducers: (builder) => {
    // FETCH PROCESS
    builder
      .addCase(fetchProcess.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProcess.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.data;
      })
      .addCase(fetchProcess.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // CREATE PROCESS
    builder
      .addCase(createProcess.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createProcess.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.data;
        state.lastCreated = action.payload;
      })
      .addCase(createProcess.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // UPDATE PROCESS  ✅ NEW
    builder
      .addCase(updateProcess.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateProcess.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastUpdated = action.payload;
       // state.list = action.payload.data;

        
      })
      .addCase(updateProcess.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearProcessError, resetProcessStatus } = processSlice.actions;
export default processSlice.reducer;
