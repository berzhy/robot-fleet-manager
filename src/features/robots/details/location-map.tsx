import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import type { Robot, SiteRobot } from "@/modules/robots/robot";
import { connectionStatus, isStale } from "@/modules/telemetry/freshness";

import {
  facilityAreas,
  getFacilityLayout,
  planHeight,
  planWidth,
  type FacilityArea,
  type PlanPoint,
} from "./facility-layouts";
import FacilityPlan from "./facility-plan";
import {
  ChargingStationSymbol,
  PeerDot,
  PeerDots,
  SelectedRobotMarker,
  selectedMarkerSizePx,
} from "./map-symbols";

// Below this width an area has room for its name only, so who is where moves
// to a list under the plan.
const narrowPlanWidthPx = 480;
const onNarrowPlan = `@container (max-width: ${narrowPlanWidthPx - 1}px)`;

/** Where the robot is at its site, among the site's other robots. */
export default function LocationMap({
  robot,
  peers,
  evaluatedAt,
  unverified,
}: {
  robot: Robot;
  peers: SiteRobot[];
  evaluatedAt: number;
  unverified: boolean;
}) {
  const layout = getFacilityLayout(robot.site);
  const robotArea = planArea(robot.area);
  // The robot may have moved since the report that placed it.
  const isLastKnown =
    unverified ||
    isStale(connectionStatus(robot.lastReceivedAt, evaluatedAt)) ||
    robot.problemCode === "position-lost";

  const otherCountIn = (area: FacilityArea | undefined) =>
    peers.filter((peer) => planArea(peer.area) === area).length;
  const areas = facilityAreas.map((area) => ({
    ...area,
    anchor: layout.labelAnchors[area.name],
    hasRobot: robotArea === area.name,
    otherCount: otherCountIn(area.name),
  }));
  const occupiedAreas = areas.filter(
    (area) => area.hasRobot || area.otherCount > 0,
  );
  const otherCountOffPlan = otherCountIn(undefined);

  return (
    <Stack spacing={1.5} sx={{ containerType: "inline-size" }}>
      <Box>
        <Typography
          variant="h6"
          component="h2"
          sx={{ overflowWrap: "anywhere" }}
        >
          {robot.site}
        </Typography>
        {layout.details && (
          <Typography color="textSecondary" sx={{ mt: 0.5 }}>
            {layout.details.type} · {layout.details.floorArea}
          </Typography>
        )}
      </Box>
      <Box sx={{ position: "relative" }}>
        <Box
          component="svg"
          viewBox={`0 0 ${planWidth} ${planHeight}`}
          aria-hidden="true"
          sx={{ display: "block", width: "100%", height: "auto" }}
        >
          <FacilityPlan layout={layout} />
        </Box>
        {areas.map((area) => (
          <AreaLabel
            key={area.name}
            label={area.label}
            anchor={area.anchor}
            hasRobot={area.hasRobot}
            isLastKnown={isLastKnown}
            otherCount={area.otherCount}
          />
        ))}
      </Box>
      <Box
        component="ul"
        sx={{
          display: "none",
          m: 0,
          p: 0,
          listStyle: "none",
          [onNarrowPlan]: { display: "block" },
        }}
      >
        {occupiedAreas.map((area) => (
          <Typography
            key={area.name}
            component="li"
            variant="body2"
            color="textSecondary"
          >
            {area.label}: {describeOccupants(area.hasRobot, area.otherCount)}
          </Typography>
        ))}
      </Box>
      {(robotArea === undefined || otherCountOffPlan > 0) && (
        <Typography variant="body2" color="textSecondary">
          Area unknown:{" "}
          {describeOccupants(robotArea === undefined, otherCountOffPlan)}
        </Typography>
      )}
      <MapLegend isLastKnown={isLastKnown} />
    </Stack>
  );
}

/** An area's name and who is in it, placed over the area on the plan. */
function AreaLabel({
  label,
  anchor: [x, y],
  hasRobot,
  isLastKnown,
  otherCount,
}: {
  label: string;
  anchor: PlanPoint;
  hasRobot: boolean;
  isLastKnown: boolean;
  otherCount: number;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        left: `${(x / planWidth) * 100}%`,
        top: `${(y / planHeight) * 100}%`,
      }}
    >
      <Typography
        variant="subtitle2"
        component="p"
        sx={{
          whiteSpace: "nowrap",
          // Smaller, with the name's weight.
          [onNarrowPlan]: {
            typography: "caption",
            fontWeight: "fontWeightMedium",
          },
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        {hasRobot && (
          <SelectedRobotMarker
            isLastKnown={isLastKnown}
            label={
              isLastKnown ? "This robot, last reported here" : "This robot"
            }
          />
        )}
        {otherCount > 0 && (
          // The list under a narrow plan says this instead.
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", [onNarrowPlan]: { display: "none" } }}
          >
            <PeerDots count={otherCount} />
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              {formatOtherRobots(otherCount)}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function MapLegend({ isLastKnown }: { isLastKnown: boolean }) {
  return (
    <Stack
      component="ul"
      aria-label="Map legend"
      direction="row"
      useFlexGap
      sx={{
        m: 0,
        p: 0,
        listStyle: "none",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 3,
        rowGap: 1,
      }}
    >
      <LegendItem symbol={<SelectedRobotMarker isLastKnown={isLastKnown} />}>
        {isLastKnown ? "This robot, last reported area" : "This robot"}
      </LegendItem>
      {/* A narrow plan has no dots; the list under it counts robots instead. */}
      <LegendItem
        symbol={<PeerDot />}
        sx={{ [onNarrowPlan]: { display: "none" } }}
      >
        Other robots
      </LegendItem>
      <LegendItem symbol={<ChargingStationSymbol />}>
        Charging station
      </LegendItem>
    </Stack>
  );
}

function LegendItem({
  symbol,
  sx,
  children,
}: {
  symbol: ReactNode;
  sx?: SxProps<Theme>;
  children: ReactNode;
}) {
  return (
    <Box component="li" sx={sx}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            // The widest symbol, so the legend texts line up.
            width: selectedMarkerSizePx,
          }}
        >
          {symbol}
        </Box>
        <Typography variant="body2" color="textSecondary">
          {children}
        </Typography>
      </Stack>
    </Box>
  );
}

/** The plan's area for a reported one; undefined when it is not on the plan. */
function planArea(area: string | null): FacilityArea | undefined {
  return facilityAreas.find((option) => option.name === area)?.name;
}

function formatOtherRobots(count: number) {
  return `${count} other ${count === 1 ? "robot" : "robots"}`;
}

function describeOccupants(hasRobot: boolean, otherCount: number) {
  return [
    hasRobot && "this robot",
    otherCount > 0 && formatOtherRobots(otherCount),
  ]
    .filter(Boolean)
    .join(", ");
}
