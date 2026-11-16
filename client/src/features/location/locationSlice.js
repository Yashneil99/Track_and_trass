import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as locationService from "./locationService";

export const createLocation = createAsyncThunk(
  "location/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await locationService.createNewLocation(payload);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create location",
      );
    }
  },
);
export const createBulkLocations = createAsyncThunk(
  "location/createBulk",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await locationService.createBulkLocations(payload);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create bulk locations",
      );
    }
  },
);
export const fetchAllLocation = createAsyncThunk(
  "location/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await locationService.getAllLocation();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch locations",
      );
    }
  },
);
export const fetchLocationTree = createAsyncThunk(
  "location/fetchTree",
  async (_, { rejectWithValue }) => {
    try {
      return await locationService.getLocationTree();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch location tree",
      );
    }
  },
);
export const deleteLocation = createAsyncThunk(
  "location/delete",
  async (locationId, { rejectWithValue }) => {
    try {
      const res = await locationService.deleteLocationTree(locationId);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create bulk locations",
      );
    }
  },
);

const locationSlice = createSlice({
  name: "location",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    lastCreated: null,
    tree: [],
  },
  reducers: {
    clearLocationError: (state) => {
      state.error = null;
    },
    resetLocationStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.lastCreated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createLocation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.status = "succeeded";
        // state.list = action.payload.data;
        state.lastCreated = action.payload;
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.lastCreated = null;
      });
    builder
      .addCase(createBulkLocations.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createBulkLocations.fulfilled, (state, action) => {
        state.status = "succeeded";
        // state.list = action.payload.data;
        state.lastCreated = action.payload;
      })
      .addCase(createBulkLocations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.lastCreated = null;
      });
    builder
      .addCase(fetchAllLocation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAllLocation.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.data;
      })
      .addCase(fetchAllLocation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
    builder
      .addCase(fetchLocationTree.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchLocationTree.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tree = action.payload.data;
      })
      .addCase(fetchLocationTree.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
       .addCase(deleteLocation.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.data;
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearLocationError, resetLocationStatus } =
  locationSlice.actions;
export default locationSlice.reducer;
