"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import type { Robot } from "@/modules/robots/robot";
import { connectionStatus, reportAge } from "@/modules/telemetry/freshness";

import ConnectionStatus from "../connection-status/connection-status";
import useLiveRobot from "../hooks/use-live-robot";
import useReportClock from "../hooks/use-report-clock";
import {
  formatActivity,
  formatBattery,
  formatRobotType,
  formatIntegrationType,
} from "../utils/robot-formatters";

export default function RobotDetails({
  robot: initial,
  verifiedAt: initialVerifiedAt = 0,
}: {
  robot: Robot;
  verifiedAt?: number;
}) {
  const { robot, missing, interrupted, unverified, verifiedAt } = useLiveRobot(
    initial,
    initialVerifiedAt,
  );
  const now = useReportClock();
  const connection = connectionStatus(
    robot.lastReceivedAt,
    unverified || !now ? verifiedAt : now,
  );
  const showReportAge = connection === "Delayed" || connection === "Offline";
  const fields = {
    id: { label: "ID", value: robot.id },
    manufacturer: { label: "Manufacturer", value: robot.manufacturer },
    type: { label: "Type", value: formatRobotType(robot.type) },
    integration: {
      label: "Integration",
      value: formatIntegrationType(robot.integrationType),
    },
    site: { label: "Site", value: robot.site },
    area: { label: "Area", value: robot.area ?? "Unknown" },
    activity: { label: "Activity", value: formatActivity(robot.activity) },
    battery: { label: "Battery", value: formatBattery(robot.batteryPercent) },
    connection: {
      label: "Connection",
      value: (
        <ConnectionStatus
          status={
            robot.lastReceivedAt === null
              ? "Unknown"
              : verifiedAt
                ? connection
                : "Checking"
          }
          unverified={
            robot.lastReceivedAt !== null && Boolean(verifiedAt) && unverified
          }
        />
      ),
    },
    ...(showReportAge
      ? {
          "report-age": {
            label: "Last report",
            value: reportAge(robot.lastReceivedAt, now || verifiedAt),
          },
        }
      : {}),
  };
  return (
    <Stack data-testid="robot-details" spacing={3}>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link component={NextLink} href="/">
          Fleet dashboard
        </Link>
        <Typography aria-current="page">{robot.name}</Typography>
      </Breadcrumbs>
      <Typography component="h1" variant="h4">
        {robot.name}
      </Typography>
      {interrupted && (
        <Alert data-testid="robot-refresh-warning" severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      {missing ? (
        <Typography data-testid="robot-unavailable">
          Robot is no longer available.{" "}
          <Link component={NextLink} href="/">
            Fleet dashboard
          </Link>
        </Typography>
      ) : (
        <Box component="dl" sx={{ m: 0 }}>
          {Object.entries(fields).map(([field, { label, value }]) => (
            <Box key={field} sx={{ mb: 2 }}>
              <Typography component="dt" variant="body2" color="textSecondary">
                {label}
              </Typography>
              <Typography
                data-testid={`robot-${field}`}
                component="dd"
                sx={{ m: 0 }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {!missing && showReportAge && (
        <Typography>Telemetry values are last known.</Typography>
      )}
    </Stack>
  );
}
