import type { Theme } from "@mui/material/styles";

/**
 * Tunes the gold brand artwork (the logo and the empty and work-in-progress
 * pictures) to the scheme: darker on light surfaces, brighter on dark ones.
 */
export const brandArtworkSx = [
  { filter: "brightness(0.8)" },
  (theme: Theme) => theme.applyStyles("dark", { filter: "brightness(1.6)" }),
] as const;
