import type { Theme } from "@mui/material/styles";

/**
 * Brightens the gold illustrations on dark surfaces. On light ones they show as
 * drawn: their lines reach 4.4:1 against the grey page.
 */
export const illustrationSx = (theme: Theme) =>
  theme.applyStyles("dark", { filter: "brightness(1.15)" });
