import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as raiseService from "./raiseService";

export const createNewRaiseRequest = createAsyncThunk(
  "raise/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await raiseService.raiseNewOutwardRequest(payload);
      return res;
    } catch (err) {
      // The service re-throws the backend message as `err.message`, so surface
      // that first (e.g. "A request for location 'X' is already PENDING ...")
      // instead of falling straight to the generic fallback.
      return rejectWithValue(
        err.response?.data?.message ||
          err.message ||
          "Failed to create new raise request"
      );
    }
  }
);

const raiseSlice = createSlice({
  name: "raise",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    lastCreated: null,
    lastUpdated: null,   // NEW
  },

  reducers: {
    clearRaiserror: (state) => {
      state.error = null;
    },
    resetRaiseStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.lastCreated = null;
      state.lastUpdated = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(createNewRaiseRequest.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createNewRaiseRequest.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastCreated = action.payload;
      })
      .addCase(createNewRaiseRequest.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearRaiserror, resetRaiseStatus } = raiseSlice.actions;
export default raiseSlice.reducer;