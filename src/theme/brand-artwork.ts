import type { Theme } from "@mui/material/styles";

/**
 * Darkens the gold artwork on light surfaces and brightens it on dark ones.
 */
export const brandArtworkSx = [
  { filter: "brightness(0.8)" },
  (theme: Theme) => theme.applyStyles("dark", { filter: "brightness(1.6)" }),
] as const;
