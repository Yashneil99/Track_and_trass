import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as userService from "./userService";

// --- Async Thunks --- //
export const fetchUsers = createAsyncThunk(
  "users",
  async (_, { rejectWithValue }) => {
    try {
      return await userService.getAllUsers();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
    }
  }
);

export const changeUserStatus = createAsyncThunk(
  "users/changeStatus",
  async ({ userId, status }, { rejectWithValue }) => {
    try {
      const res = await userService.updateUserStatus(userId, status);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update status");
    }
  }
);

// --- Slice --- //
const userSlice = createSlice({
  name: "users",
  initialState: {
    list: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.data;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Change User Status
      .addCase(changeUserStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.list.findIndex((u) => u.user_id === updated.user_id);
        if (index !== -1) state.list[index] = updated;
      });
  },
});

export default userSlice.reducer;
