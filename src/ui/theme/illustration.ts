import type { Theme } from "@mui/material/styles";

/**
 * Brightens the gold illustrations on dark surfaces. On light surfaces they
 * show as drawn.
 */
export const illustrationSx = (theme: Theme) =>
  theme.applyStyles("dark", { filter: "brightness(1.15)" });
