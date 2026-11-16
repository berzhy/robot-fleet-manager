"use client";
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { RobotContext } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import { connectionStatus, reportAge } from "@/modules/telemetry/freshness";
import { sendRobotAction } from "../api/robot-api";
import ActionNotification from "../action-notification";
import ConnectionStatus from "../connection-status/connection-status";
import useLiveRobot from "../hooks/use-live-robot";
import useReportClock from "../hooks/use-report-clock";
import {
  formatActivity,
  formatBattery,
  formatRobotType,
} from "../utils/robot-formatters";
import ActivityControls from "./activity-controls";
import LocationMap from "./location-map";
import RobotProfile from "./robot-profile";

export default function RobotDetails(initial: RobotContext) {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);
  const {
    robot,
    siteRobots,
    missing,
    interrupted,
    refreshing,
    unverified,
    verifiedAt,
    reload,
    invalidate,
  } = useLiveRobot(initial, pending);
  const now = useReportClock(pending || refreshing);
  const evaluatedAt = unverified || !now ? verifiedAt : now;
  const connection = connectionStatus(robot.lastReceivedAt, evaluatedAt);
  const stale = connection === "Delayed" || connection === "Offline";
  async function act(action: RobotAction) {
    if (
      inFlight.current ||
      refreshing ||
      unverified ||
      actionUnavailable(robot, action, Date.now())
    )
      return;
    invalidate();
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    try {
      await sendRobotAction(robot.id, action);
      setNotice({
        severity: "success",
        message: `${actionLabels[action]} requested.`,
      });
    } catch {
      setNotice({
        severity: "error",
        message: "Unable to request activity change. Please try again.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
      reload();
    }
  }
  return (
    <Stack
      data-testid="robot-details"
      spacing={3}
      sx={{ width: "100%", maxWidth: 1440, mx: "auto" }}
    >
      <Breadcrumbs aria-label="Breadcrumb">
        <Link component={NextLink} href="/">
          Fleet dashboard
        </Link>
        <Typography aria-current="page">{robot.name}</Typography>
      </Breadcrumbs>
      <Box>
        <Typography
          component="h1"
          variant="h4"
          sx={{ overflowWrap: "anywhere" }}
        >
          {robot.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          {robot.manufacturer} · {formatRobotType(robot.type)}
        </Typography>
      </Box>
      {missing ? (
        <Alert data-testid="robot-unavailable" severity="info">
          Robot is no longer available.{" "}
          <Link component={NextLink} href="/">
            Fleet dashboard
          </Link>
        </Alert>
      ) : (
        <>
          {interrupted && (
            <Alert data-testid="robot-refresh-warning" severity="warning">
              Live updates interrupted. Showing last-known data and connection
              states.
            </Alert>
          )}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Connection
                  </Typography>
                  <Typography
                    component="div"
                    variant="h6"
                    data-testid="robot-connection"
                  >
                    <ConnectionStatus
                      status={
                        robot.lastReceivedAt === null
                          ? "Unknown"
                          : verifiedAt
                            ? connection
                            : "Checking"
                      }
                      unverified={unverified}
                    />
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    {stale || unverified ? "Last reported battery" : "Battery"}
                  </Typography>
                  <Typography
                    component="p"
                    data-testid="robot-battery"
                    variant="h6"
                  >
                    {formatBattery(robot.batteryPercent)}
                  </Typography>
                  {robot.batteryPercent !== null && (
                    <LinearProgress
                      variant="determinate"
                      value={robot.batteryPercent}
                      aria-label="Battery level"
                      sx={{ mt: 0.5, width: 120 }}
                    />
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stale || unverified
                      ? "Last reported activity"
                      : "Activity"}
                  </Typography>
                  <Typography
                    component="p"
                    data-testid="robot-activity"
                    variant="h6"
                  >
                    {formatActivity(robot.activity)}
                  </Typography>
                </Box>
              </Stack>
              {robot.problemCode && (
                <Alert severity="warning">
                  Path blocked. Clear the obstruction before retrying activity.
                </Alert>
              )}
              {stale && (
                <Typography variant="body2" color="text.secondary">
                  Telemetry values are last known.{" "}
                  {reportAge(robot.lastReceivedAt, evaluatedAt)}.
                </Typography>
              )}
              <ActivityControls
                robot={robot}
                now={evaluatedAt}
                unverified={unverified || refreshing || !verifiedAt}
                pending={pending}
                onAction={(action) => void act(action)}
              />
            </Stack>
          </Paper>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 1.7fr) minmax(0, 1fr)",
              },
              gap: 3,
              alignItems: "start",
            }}
          >
            <LocationMap
              robot={robot}
              peers={siteRobots}
              now={evaluatedAt}
              unverified={unverified}
            />
            <RobotProfile robot={robot} />
          </Box>
        </>
      )}
      {notice && (
        <ActionNotification {...notice} onClose={() => setNotice(null)} />
      )}
    </Stack>
  );
}
