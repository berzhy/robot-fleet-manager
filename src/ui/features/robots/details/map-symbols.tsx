import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

import { ChargingBayGlyph, chargingBaySize } from "./facility-plan";

export const selectedMarkerSizePx = 28;
const peerDotSizePx = 6;
const peerDotGapPx = 3;
const peerDotColumns = 4;
// Three rows of dots; the count beside them gives the exact number.
const peerDotLimit = 12;
const chargingStationHeightPx = 20;
// Room for the glyph's stroke at the edges of its box.
const chargingStationInsetUnits = 1;

/**
 * Where this robot is. Once its area is only last known, the centre dot goes
 * and the ring fades.
 */
export function SelectedRobotMarker({
  isLastKnown,
  label,
}: {
  isLastKnown: boolean;
  /** Names the marker for screen readers; leave it out next to visible text. */
  label?: string;
}) {
  const { palette } = useTheme().vars;

  return (
    <Box
      component="svg"
      viewBox="-10 -10 20 20"
      width={selectedMarkerSizePx}
      height={selectedMarkerSizePx}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      sx={{
        flexShrink: 0,
        color: "primary.main",
        opacity: isLastKnown ? 0.5 : 1,
      }}
    >
      <circle r="10" fill="currentColor" opacity={0.12} />
      <circle
        r="6"
        fill={palette.background.paper}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {!isLastKnown && <circle r="2.5" fill="currentColor" />}
    </Box>
  );
}

/** Another robot at the same site. */
export function PeerDot() {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "block",
        width: peerDotSizePx,
        height: peerDotSizePx,
        borderRadius: "50%",
        bgcolor: "text.secondary",
      }}
    />
  );
}

/** A dot per robot, up to a few rows, to show at a glance how busy an area is. */
export function PeerDots({ count }: { count: number }) {
  const dots = Math.min(count, peerDotLimit);

  return (
    <Box
      aria-hidden
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(dots, peerDotColumns)}, ${peerDotSizePx}px)`,
        gap: `${peerDotGapPx}px`,
      }}
    >
      {Array.from({ length: dots }, (_, index) => (
        <PeerDot key={index} />
      ))}
    </Box>
  );
}

/** The plan's charging bay, at a size to sit beside text. */
export function ChargingStationSymbol() {
  const inset = chargingStationInsetUnits;

  return (
    <Box
      component="svg"
      viewBox={`${-inset} ${-inset} ${chargingBaySize.width + 2 * inset} ${chargingBaySize.height + 2 * inset}`}
      aria-hidden="true"
      sx={{ height: chargingStationHeightPx, color: "info.main" }}
    >
      <ChargingBayGlyph />
    </Box>
  );
}
