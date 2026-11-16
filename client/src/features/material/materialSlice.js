import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as materialService from "../material/materialService";

export const createMaterial = createAsyncThunk(
  "material/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await materialService.createMaterialRequest(payload);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create material",
      );
    }
  },
);

export const fetchMaterials = createAsyncThunk(
  "material/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await materialService.getAllMaterialsRequest();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch materials",
      );
    }
  },
);

export const fetchStaleMaterials = createAsyncThunk(
  "material/fetchStale",
  async (_, { rejectWithValue }) => {
    try {
      return await materialService.getStaleMaterialsRequest();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch materials",
      );
    }
  },
);

export const updateMaterial = createAsyncThunk(
  "material/update",
  async (payload, { rejectWithValue }) => {
    try {
      return await materialService.updateMaterialRequest(payload);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update material",
      );
    }
  },
);

export const deleteStaleMaterial = createAsyncThunk(
  "material/delete",
  async (materialId, { rejectWithValue }) => {
    try {
      return await materialService.deleteMaterialRequest(materialId);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update material",
      );
    }
  },
);

const materialSlice = createSlice({
  name: "material",
  initialState: {
    status: "idle",
    error: null,
    data: [],
    lastCreated: null,
  },

  reducers: {
    clearMaterialError: (state) => {
      state.error = null;
    },
    resetMaterialStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.lastCreated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createMaterial.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createMaterial.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastCreated = action.payload;
      })
      .addCase(createMaterial.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMaterials.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(updateMaterial.pending, (state) => {
        state.status = "updating";
      })
      .addCase(updateMaterial.fulfilled, (state, action) => {
        state.status = "updated";

        const updated = action.payload.data;
        const index = state.data.findIndex(
          (item) => item.material_id === updated.material_id,
        );
        if (index !== -1) {
          state.data[index] = updated;
        }
      })
      .addCase(updateMaterial.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchStaleMaterials.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchStaleMaterials.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchStaleMaterials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(deleteStaleMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteStaleMaterial.fulfilled, (state, action) => {
        state.loading = false;
        // Assuming the API returns the deleted material's ID
        state.data = state.data.filter((item) => item.id !== action.meta.arg);
      })
      .addCase(deleteStaleMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMaterialError, resetMaterialStatus } =
  materialSlice.actions;
export default materialSlice.reducer;
