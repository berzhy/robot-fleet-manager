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
    ID: robot.id,
    Manufacturer: robot.manufacturer,
    Type: formatRobotType(robot.type),
    Integration: formatIntegrationType(robot.integrationType),
    Site: robot.site,
    Area: robot.area ?? "Unknown",
    Activity: formatActivity(robot.activity),
    Battery: formatBattery(robot.batteryPercent),
    Connection: (
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
    ...(showReportAge
      ? { "Last report": reportAge(robot.lastReceivedAt, now || verifiedAt) }
      : {}),
  };
  return (
    <Stack spacing={3}>
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
        <Alert severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      {missing ? (
        <Typography>
          Robot is no longer available.{" "}
          <Link component={NextLink} href="/">
            Fleet dashboard
          </Link>
        </Typography>
      ) : (
        <Box component="dl" sx={{ m: 0 }}>
          {Object.entries(fields).map(([label, value]) => (
            <Box key={label} sx={{ mb: 2 }}>
              <Typography component="dt" variant="body2" color="textSecondary">
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0 }}>
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
