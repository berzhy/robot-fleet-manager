import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { visuallyHidden } from "@mui/utils";

import type { Robot, SiteRobot } from "@/modules/robots/robot";
import { connectionStatus, isStale } from "@/modules/telemetry/freshness";

import {
  facilityAreas,
  facilityPlanViewBox,
  getFacilityLayout,
} from "./facility-layouts";
import FacilityPlan from "./facility-plan";

const markerColumns = 4;
const markerSpacing = 16;
const markerLimit = 12;

const planMinWidthPx = 400;
const planMaxHeightPx = 640;
const sidebarWidthPx = 288;

const unknownArea = "Area unknown";
const unknownZone = { name: unknownArea, label: unknownArea, x: 62, y: 468 };

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
  const theme = useTheme();
  const palette = (theme.vars ?? theme).palette;

  const layout = getFacilityLayout(robot.site);
  const zones = facilityAreas.map((area) => {
    const [x, y] = layout.zoneAnchors[area.name];
    return { ...area, x, y };
  });

  const selectedArea = areaName(robot.area);
  const stale =
    unverified || isStale(connectionStatus(robot.lastReceivedAt, evaluatedAt));
  const groups = [...zones, unknownZone].map((zone) => ({
    ...zone,
    peers: peers
      .filter(
        (peer) => peer.id !== robot.id && areaName(peer.area) === zone.name,
      )
      .sort((a, b) => a.id.localeCompare(b.id)),
  }));

  return (
    <Paper
      component="section"
      aria-label="Location"
      variant="outlined"
      sx={{
        p: 3,
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          lg: `minmax(0, 1fr) ${sidebarWidthPx}px`,
        },
        columnGap: 3,
        alignItems: "start",
      }}
    >
      <Box sx={{ gridColumn: "1 / -1", mb: 2, overflowWrap: "anywhere" }}>
        <Typography variant="h6" component="h2">
          {robot.site} · Location
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {stale ? "Last reported area" : "Reported area"}:{" "}
          {robot.area ?? "Unknown"}
        </Typography>
      </Box>
      <Box
        role="group"
        aria-label="Facility floor plan"
        tabIndex={0}
        sx={{ containerType: "inline-size", overflowX: "auto" }}
      >
        <Box
          component="svg"
          viewBox={facilityPlanViewBox}
          aria-hidden="true"
          sx={{
            display: "block",
            width: "100%",
            minWidth: planMinWidthPx,
            height: "auto",
            maxHeight: planMaxHeightPx,
          }}
        >
          <FacilityPlan layout={layout} />
          {groups.map((zone) => {
            const isSelected = zone.name === selectedArea;
            const isUnknown = zone.name === unknownArea;

            if (isUnknown && !isSelected && zone.peers.length === 0) {
              return null;
            }

            return (
              <g key={zone.name} transform={`translate(${zone.x} ${zone.y})`}>
                {isUnknown && (
                  <rect
                    x="-30"
                    y="-38"
                    width="312"
                    height="108"
                    rx="6"
                    fill={palette.action.hover}
                    stroke={palette.text.disabled}
                    strokeDasharray="5 5"
                  />
                )}
                <Box
                  component="text"
                  fill={palette.text.primary}
                  sx={{
                    fontSize: 34,
                    fontWeight: 600,
                    "@container (min-width: 600px)": { fontSize: 26 },
                    "@container (min-width: 900px)": { fontSize: 22 },
                  }}
                >
                  {zone.label}
                </Box>
                {isSelected && (
                  <g
                    transform="translate(19 44)"
                    fill={palette.primary.main}
                    opacity={stale ? 0.5 : 1}
                  >
                    <circle r="19" opacity={0.12} />
                    <circle
                      r="10"
                      fill={palette.background.paper}
                      stroke={palette.primary.main}
                      strokeWidth="2.5"
                    />
                    <circle r="4" />
                  </g>
                )}
                <g fill={palette.text.secondary}>
                  {zone.peers.slice(0, markerLimit).map((peer, index) => (
                    <circle
                      key={peer.id}
                      cx={64 + (index % markerColumns) * markerSpacing}
                      cy={
                        28 + Math.floor(index / markerColumns) * markerSpacing
                      }
                      r="5"
                      opacity={
                        unverified ||
                        connectionStatus(peer.lastReceivedAt, evaluatedAt) !==
                          "online"
                          ? 0.35
                          : 0.8
                      }
                    />
                  ))}
                  {zone.peers.length > markerLimit && (
                    <Box
                      component="text"
                      x="136"
                      y="44"
                      dominantBaseline="central"
                      sx={{
                        fontSize: 26,
                        "@container (min-width: 600px)": { fontSize: 18 },
                        "@container (min-width: 900px)": { fontSize: 16 },
                      }}
                    >
                      +{zone.peers.length - markerLimit}
                    </Box>
                  )}
                </g>
              </g>
            );
          })}
        </Box>
      </Box>
      <Box component="ul" sx={visuallyHidden}>
        {groups
          .filter((zone) => zone.peers.length > 0)
          .map((zone) => (
            <li key={zone.name}>
              {zone.name}: {zone.peers.length} other{" "}
              {zone.peers.length === 1 ? "robot" : "robots"}
            </li>
          ))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            lg: "minmax(0, 1fr)",
          },
          gap: { xs: 2, sm: 3, lg: 5 },
          alignSelf: { lg: "stretch" },
          alignContent: "start",
          alignItems: "start",
          mt: { xs: 2, lg: 0 },
          pt: { xs: 3, lg: 0 },
          pl: { lg: 3 },
          borderWidth: { xs: "1px 0 0", lg: "0 0 0 1px" },
          borderStyle: "solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography
            component="h3"
            variant="subtitle2"
            sx={{ mb: { xs: 2, lg: 2.5 } }}
          >
            Facility details
          </Typography>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "max-content minmax(0, 1fr)",
              },
              columnGap: 1.5,
              rowGap: { xs: 0.5, sm: 1.5, lg: 2 },
              "& dd:not(:last-child)": { mb: { xs: 1, sm: 0 } },
            }}
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              Type
            </Typography>
            <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
              {layout.type}
            </Typography>
            <Typography component="dt" variant="body2" color="text.secondary">
              Floor area
            </Typography>
            <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
              {layout.floorArea}
            </Typography>
            <Typography component="dt" variant="body2" color="text.secondary">
              Charging bays
            </Typography>
            <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
              {layout.chargingBays.length}
            </Typography>
          </Box>
        </Box>
        <Box
          role="group"
          aria-label="Map legend"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, lg: 2.5 },
            alignItems: "flex-start",
          }}
        >
          <Typography component="h3" variant="subtitle2">
            Map legend
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", minWidth: 0 }}
          >
            <Box
              component="svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              aria-hidden="true"
              sx={{ color: "primary.main", flexShrink: 0 }}
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Selected robot
              </Typography>
              <Typography
                variant="subtitle2"
                component="p"
                sx={{ overflowWrap: "anywhere" }}
              >
                {robot.name}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              component="svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              aria-hidden="true"
              sx={{ color: "text.secondary", flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </Box>
            <Typography variant="body2">Other robots</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              component="svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              aria-hidden="true"
              sx={{ color: "info.main", flexShrink: 0 }}
            >
              <rect
                x="5"
                y="2"
                width="14"
                height="20"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M13 5l-5 8h8l-5 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </Box>
            <Typography variant="body2">Charging stations</Typography>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}

function areaName(area: string | null) {
  return (
    facilityAreas.find((option) => option.name === area)?.name ?? unknownArea
  );
}
