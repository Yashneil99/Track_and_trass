// src/store/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import userReducer from "../features/users/userSlice";
import materialReducer from "../features/material/materialSlice";
import processReducer from "../features/process/processSlice";
import locationReducer from "../features/location/locationSlice";
import materialMovementReducer from "../features/materialMovement/materialMovementSlice";
import stnReducer from "../features/stn/stnslice";
import raiseReducer from "../features/raise/raiseSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    process: processReducer,
    material: materialReducer,
    location: locationReducer,
    materialMovement: materialMovementReducer,
    stn: stnReducer,
    raise: raiseReducer,
  },
});

export default store;