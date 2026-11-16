import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as authService from "./authService";

export const login = createAsyncThunk("login", async ({ email, password }) => {
  return await authService.loginRequest(email, password);
});

export const register = createAsyncThunk(
  "register",
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.registerRequest(payload);
    } catch (err) {
      // Surface the backend's message (e.g. "Email already registered")
      const message =
        err?.validationErrors
          ? Object.values(err.validationErrors).find(Boolean)
          : err?.response?.data?.message || err?.message || "Registration failed";
      return rejectWithValue({ message });
    }
  }
);

export const refreshToken = createAsyncThunk("refresh", async () => {
  // No need to get refreshToken from localStorage - it's in HttpOnly cookie
  return await authService.refreshRequest({});
});

const storedUser = JSON.parse(localStorage.getItem("user"));

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser || null,
    token: null, // Token will be stored here for API requests
    status: "idle",
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("user");
      // Cookies will be cleared by server on logout
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        const userLogged = {
          userName : action.payload.userName,
          role : action.payload.role,
          userId : action.payload.userId,
          tokenExpiry: action.payload.accessTokenExpiry,
          refreshTokenExpiry: action.payload.refreshTokenExpiry
        }
        state.user = userLogged;
        localStorage.setItem("user", JSON.stringify(userLogged));
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        if (state.user && action.payload.accessTokenExpiry) {
          state.user.tokenExpiry = action.payload.accessTokenExpiry;
          localStorage.setItem("user", JSON.stringify(state.user));
        }
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
