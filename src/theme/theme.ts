"use client";

import { grey } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";
import { tabClasses } from "@mui/material/Tab";

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "class",
  },
  colorSchemes: {
    light: {
      palette: {
        // White cards stand out on a grey page. Blue text placed straight on
        // it uses primary.dark (see MuiLink and MuiTab below): the default
        // blue reaches only 4.2:1 there.
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
    MuiLink: {
      variants: [
        {
          props: { color: "primary" },
          style: ({ theme }) =>
            theme.applyStyles("light", {
              color: theme.vars.palette.primary.dark,
            }),
        },
      ],
    },
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
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          [`&.${tabClasses.selected}`]: theme.applyStyles("light", {
            color: theme.vars.palette.primary.dark,
          }),
        }),
      },
    },
  },
});

export default theme;
