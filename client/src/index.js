import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { setStore } from "./services/api";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeContextProvider } from "./Context/themeContext";

//  Inject Redux store before rendering the App
setStore(store);

//  Replace this with your actual Google Client ID
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <CssBaseline />
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeContextProvider>
          <App />
        </ThemeContextProvider>
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>
);
