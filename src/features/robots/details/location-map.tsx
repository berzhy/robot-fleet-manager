import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import type { Robot, SiteRobot } from "@/modules/robots/robot";
import { connectionStatus } from "@/modules/telemetry/freshness";

import FacilityPlan, { facilityDetails } from "./facility-plan";

const markerLimit = 12;
const zones = [
  { name: "Lobby", x: 274, y: 168, peersX: 218, peersY: 206 },
  { name: "Floor 1", x: 636, y: 216, peersX: 680, peersY: 216 },
  { name: "Warehouse", x: 328, y: 364, peersX: 310, peersY: 480 },
  { name: "Base", x: 612, y: 448, peersX: 484, peersY: 448 },
  { name: "Area unknown", x: 470, y: 560, peersX: 556, peersY: 556 },
];

function areaName(area: string | null) {
  return zones.some((zone) => zone.name === area) ? area : "Area unknown";
}

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
  const selectedArea = areaName(robot.area);
  const stale =
    unverified ||
    ["Delayed", "Offline"].includes(
      connectionStatus(robot.lastReceivedAt, evaluatedAt),
    );
  const groups = zones.map((zone) => ({
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
      sx={{ p: 3 }}
    >
      <Typography variant="h6" component="h2">
        {robot.site} · Location
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {stale ? "Last reported area" : "Reported area"}:{" "}
        {robot.area ?? "Unknown"}
      </Typography>
      <Box
        component="svg"
        viewBox="0 0 800 616"
        aria-hidden="true"
        sx={(theme) => {
          const palette = (theme.vars ?? theme).palette;
          return {
            width: "100%",
            display: "block",
            mt: 2,
            color: palette.text.secondary,
          };
        }}
      >
        <FacilityPlan />
        {groups.map((zone) => (
          <g key={zone.name}>
            {zone.name === selectedArea && (
              <g opacity={stale ? 0.5 : 1}>
                <Box
                  component="circle"
                  cx={zone.x}
                  cy={zone.y}
                  r="19"
                  sx={(theme) => ({
                    fill: (theme.vars ?? theme).palette.primary.main,
                    opacity: 0.12,
                  })}
                />
                <Box
                  component="circle"
                  cx={zone.x}
                  cy={zone.y}
                  r="10"
                  sx={(theme) => ({
                    fill: (theme.vars ?? theme).palette.background.paper,
                    stroke: (theme.vars ?? theme).palette.primary.main,
                    strokeWidth: 2.5,
                  })}
                />
                <Box
                  component="circle"
                  cx={zone.x}
                  cy={zone.y}
                  r="4"
                  sx={(theme) => ({
                    fill: (theme.vars ?? theme).palette.primary.main,
                  })}
                />
              </g>
            )}
            {zone.peers.slice(0, markerLimit).map((peer, index) => (
              <Box
                key={peer.id}
                component="circle"
                cx={zone.peersX + (index % 4) * 13}
                cy={zone.peersY + Math.floor(index / 4) * 13}
                r="4"
                opacity={
                  unverified ||
                  connectionStatus(peer.lastReceivedAt, evaluatedAt) !==
                    "Online"
                    ? 0.35
                    : 0.8
                }
                sx={(theme) => ({
                  fill: (theme.vars ?? theme).palette.text.secondary,
                })}
              />
            ))}
            {zone.peers.length > markerLimit && (
              <text
                x={zone.peersX + 58}
                y={zone.peersY + 18}
                fill="currentColor"
                fontSize="12"
              >
                +{zone.peers.length - markerLimit}
              </text>
            )}
            {zone.name === "Area unknown" &&
              (selectedArea === zone.name || zone.peers.length > 0) && (
                <text x="448" y="594" fill="currentColor" fontSize="11">
                  Area unknown
                </text>
              )}
          </g>
        ))}
      </Box>
      <Box
        component="ul"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          p: 0,
          m: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {groups
          .filter((zone) => zone.peers.length > 0)
          .map((zone) => (
            <li key={zone.name}>
              {zone.name}: {zone.peers.length} other{" "}
              {zone.peers.length === 1 ? "robot" : "robots"}
            </li>
          ))}
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "minmax(0, 1fr) minmax(0, 0.85fr)",
          },
          columnGap: { sm: 8, lg: 10 },
          rowGap: 3,
          alignItems: "start",
        }}
      >
        <Box>
          <Typography component="h3" variant="subtitle2" sx={{ mb: 2 }}>
            Facility details
          </Typography>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: "max-content minmax(0, 1fr)",
              columnGap: 2,
              rowGap: 1.5,
            }}
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              Type
            </Typography>
            <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
              {facilityDetails.type}
            </Typography>
            <Typography component="dt" variant="body2" color="text.secondary">
              Floor area
            </Typography>
            <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
              {facilityDetails.floorArea}
            </Typography>
            <Typography component="dt" variant="body2" color="text.secondary">
              Charging bays
            </Typography>
            <Typography component="dd" variant="subtitle2" sx={{ m: 0 }}>
              {facilityDetails.chargingBays.length}
            </Typography>
          </Box>
        </Box>
        <Box
          role="group"
          aria-label="Map legend"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
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
