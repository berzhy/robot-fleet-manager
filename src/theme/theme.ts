"use client";

import { grey, orange } from "@mui/material/colors";
import { createTheme, darken } from "@mui/material/styles";
import { tabClasses } from "@mui/material/Tab";
// Types `theme.vars` as always present: this app always uses CSS variables.
import type {} from "@mui/material/themeCssVarsAugmentation";

const theme = createTheme({
  // The scheme is a class on <html>, so the toggle can override the system
  // setting. CSS variables switch it without re-rendering, and
  // InitColorSchemeScript sets it before the first paint.
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
        // Warning text (low battery, log warnings) needs 4.5:1; MUI's light
        // orange reaches only 3.1:1 on white. This one is 5.1:1 on white and
        // 4.7:1 on the grey page.
        warning: { main: darken(orange[800], 0.25) },
      },
    },
    dark: true,
  },
  // MUI's own keyboard focus ring: its default focus feedback is a faint
  // ripple. MUI draws the ring inside Tabs, Cards and menu items, where an
  // outside ring would be clipped.
  focusVisible: true,
  // A softer corner than MUI's 4px, shared by cards, tiles and buttons.
  shape: { borderRadius: 8 },
  typography: {
    // The app font, loaded by next/font in the root layout.
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    // Page titles anchor the page; MUI's h4 weight is 400.
    h4: { fontWeight: 600 },
    // Sentence case reads better than MUI's uppercase labels.
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
    // The focus ring is the focus signal; MUI's focus ripple on top fills the
    // whole control with a pulsing blob.
    MuiButton: { defaultProps: { disableFocusRipple: true } },
    MuiIconButton: { defaultProps: { disableFocusRipple: true } },
    MuiTab: {
      defaultProps: { disableFocusRipple: true },
      styleOverrides: {
        root: ({ theme }) => ({
          // Sentence case, like buttons.
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
