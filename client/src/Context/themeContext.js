// ThemeContext.js
import React, { createContext, useContext, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

const ThemeContext = createContext();

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main : "#10A597"
      // main: "rgba(28, 168, 223, 0.77)",
      //  main: "#3C90F6",
    },
    secondary: {
      main: "#d32f2f",
    },
    warning: {
      main: "#ed6c02",
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "rgba(121, 15, 240, 0.77)",
    },
    secondary: {
      main: "#d32f2f",
    },
    warning: {
      main: "#ffa726",
    },
  },
});

export const ThemeContextProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
