"use client";

import { grey } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "class",
  },
  colorSchemes: {
    light: {
      palette: {
        background: { default: grey[100] },
      },
    },
    dark: true,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    h4: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        // A crisp outline instead of the ripple-shaped focus highlight.
        root: ({ theme }) => ({
          "&.Mui-focusVisible": {
            outline: `2px solid ${theme.vars.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    // The outline above replaces the focus ripple.
    MuiButton: { defaultProps: { disableFocusRipple: true } },
    MuiIconButton: { defaultProps: { disableFocusRipple: true } },
    MuiTab: {
      defaultProps: { disableFocusRipple: true },
      styleOverrides: { root: { textTransform: "none" } },
    },
  },
});

export default theme;
