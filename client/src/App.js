import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/appRoutes";
import { Provider } from "react-redux";
import store from "./store/store";

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}
