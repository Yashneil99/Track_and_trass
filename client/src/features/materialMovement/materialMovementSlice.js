import * as materialMovementService from "../materialMovement/materialMovementService";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const createMaterialMovement = createAsyncThunk(
  "materialMovement/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await materialMovementService.createMaterialMovementRequest(
        payload,
      );
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create material movement",
      );
    }
  },
);

export const fetchMaterialMovement = createAsyncThunk(
  "materialMovement/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await materialMovementService.getAllMaterialMovement();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch material movement",
      );
    }
  },
);

export const fetchMaterialMovementOverTime = createAsyncThunk(
  "materialMovement/fetchMaterialMovementOverTime",
  async ({ code, from_location, to_location }, { rejectWithValue }) => {
    try {
      return await materialMovementService.getMaterialMovementOverTime(
        code,
        from_location,
        to_location,
      );
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to fetch material movement over time",
      );
    }
  },
);

export const fetchMaterialPresenceAtLocationToday = createAsyncThunk(
  "materialMovement/fetchMaterialPresenceAtLocationToday",
  async ({ code }, { rejectWithValue }) => {
    try {
      const res =
        await materialMovementService.getMaterialPresenceAtLocationToday(code);
      return res;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Something went wrong");
    }
  },
);

export const fetchAverageOfMovementTimePerRoute = createAsyncThunk(
  "materialMovement/fetchAverageOfMovementTimePerRoute",
  async ({ code }, { rejectWithValue }) => {
    try {
      const res =
        await materialMovementService.getAverageOfMovementTimePerRoute(code);
      return res;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Something went wrong");
    }
  },
);

export const fetchAverageOfAllMovementTime = createAsyncThunk(
  "materialMovement/fetchAverageOfAllMovementTime",
  async ({ code }, { rejectWithValue }) => {
    try {
      return await materialMovementService.getAverageOfAllMovementTime(code);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch average movement time",
      );
    }
  },
);

export const fetchAllMaterialPresenceAtLocationSpecificDate = createAsyncThunk(
  "materialMovement/fetchAllMaterialPresenceAtLocationSpecificDate",
  async (date, { rejectWithValue }) => {
    try {
      return await materialMovementService.getAllMaterialPresenceAtLocationSpecificDate(
        date,
      );
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to fetch AllMaterial Presence At Location SpecificDate",
      );
    }
  },
);

export const fetchAllCurrentMaterialPresenceAtAllLocations = createAsyncThunk(
  "materialMovement/fetchAllCurrentMaterialPresenceAtAllLocations",
  async (_, { rejectWithValue }) => {
    try {
      return await materialMovementService.getAllCurrentMaterialPresenceAtAllLocations();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to fetch AllMaterial Presence At Location",
      );
    }
  },
);

export const fetchMaterialRoutingHistoryTillDate = createAsyncThunk(
  "materialMovement/fetchMaterialRoutingHistoryTillDate",
  async (code, { rejectWithValue }) => {
    try {
      return await materialMovementService.getMaterialRoutingHistoryTillDate(
        code,
      );
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to fetch routing movement history",
      );
    }
  },
);

export const fetchOccupancyDistribution = createAsyncThunk(
  "materialMovement/fetchOccupancyDistribution",
  async (_, { rejectWithValue }) => {
    try {
      return await materialMovementService.getOccupancyDistribution();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch occupancy distribution",
      );
    }
  },
);

export const fetchMaterialPresenceFromToDate = createAsyncThunk(
  "materialMovement/fetchMaterialPresenceFromToDate",
  async ({fromDate,toDate}, { rejectWithValue }) => {
    try {
      return await materialMovementService.getMaterialPresenceFromToDate(
        fromDate,toDate
      );
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to fetch material presence from to date",
      );
    }
  },
);

const materialMovementSlice = createSlice({
  name: "materialmovement",
  initialState: {
    status: "idle",
    error: null,
    data: [],
    movements: [], // ✅ for fetchMaterialMovement
    presenceAll: [],
    lastCreated: null,
    presenceToday: [],
    avgTimePerRoute: [],
    avgOfAllMovement: [],
    presenceAllMaterialLocationnSpecicDate: [],
    routingHistory: [],
    occupancyDistribution: [],
    presenceFromToDate : []
  },
  reducers: {
    clearMaterialMovementError: (state) => {
      state.error = null;
    },
    resetMaterialMovementStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.lastCreated = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterialMovement.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMaterialMovement.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload.data;
        state.movements = action.payload.data;
      })
      .addCase(fetchMaterialMovement.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createMaterialMovement.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createMaterialMovement.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastCreated = action.payload;
      })
      .addCase(createMaterialMovement.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMaterialMovementOverTime.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMaterialMovementOverTime.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload.data;
      })
      .addCase(fetchMaterialMovementOverTime.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMaterialPresenceAtLocationToday.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchMaterialPresenceAtLocationToday.fulfilled,
        (state, action) => {
          state.status = "succeeded";
          state.presenceToday = action.payload.data;
        },
      )
      .addCase(
        fetchMaterialPresenceAtLocationToday.rejected,
        (state, action) => {
          state.status = "failed";
          state.error = action.payload;
        },
      )
      .addCase(fetchAverageOfMovementTimePerRoute.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchAverageOfMovementTimePerRoute.fulfilled,
        (state, action) => {
          state.status = "succeeded";
          state.avgTimePerRoute = action.payload.data;
        },
      )
      .addCase(fetchAverageOfMovementTimePerRoute.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchAverageOfAllMovementTime.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAverageOfAllMovementTime.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload.data;
      })
      .addCase(fetchAverageOfAllMovementTime.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(
        fetchAllMaterialPresenceAtLocationSpecificDate.pending,
        (state) => {
          state.status = "loading";
          state.error = null;
        },
      )
      .addCase(
        fetchAllMaterialPresenceAtLocationSpecificDate.fulfilled,
        (state, action) => {
          state.status = "succeeded";
          state.presenceAllMaterialLocationnSpecicDate = action.payload.data;
        },
      )
      .addCase(
        fetchAllMaterialPresenceAtLocationSpecificDate.rejected,
        (state, action) => {
          state.status = "failed";
          state.error = action.payload;
        },
      )
      .addCase(
        fetchAllCurrentMaterialPresenceAtAllLocations.pending,
        (state) => {
          state.status = "loading";
          state.error = null;
        },
      )
      .addCase(
        fetchAllCurrentMaterialPresenceAtAllLocations.fulfilled,
        (state, action) => {
          state.status = "succeeded";
          state.data = action.payload.data;
          state.presenceAll = action.payload.data;
        },
      )
      .addCase(
        fetchAllCurrentMaterialPresenceAtAllLocations.rejected,
        (state, action) => {
          state.status = "failed";
          state.error = action.payload;
        },
      )
      .addCase(fetchMaterialRoutingHistoryTillDate.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchMaterialRoutingHistoryTillDate.fulfilled,
        (state, action) => {
          state.status = "succeeded";
          state.routingHistory = action.payload.data;
        },
      )
      .addCase(
        fetchMaterialRoutingHistoryTillDate.rejected,
        (state, action) => {
          state.status = "failed";
          state.error = action.payload;
        },
      )
      .addCase(fetchOccupancyDistribution.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchOccupancyDistribution.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.occupancyDistribution = action.payload.data;
      })
      .addCase(fetchOccupancyDistribution.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMaterialPresenceFromToDate.pending,(state) => {
         state.status = "loading";
        state.error = null;
      })
       .addCase(fetchMaterialPresenceFromToDate.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.presenceFromToDate = action.payload.data;
      })
      .addCase(fetchMaterialPresenceFromToDate.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
  },
});

export const { clearMaterialMovementError, resetMaterialMovementStatus } =
  materialMovementSlice.actions;

export default materialMovementSlice.reducer;
