"use client";
import { robotProblemDetails } from "@/modules/robots/robot-problems";
import { useId, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { RobotContext } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import { connectionStatus, reportAge } from "@/modules/telemetry/freshness";
import { isRequestTimeout } from "../api/robot-api";
import useRobotMutations from "../hooks/use-robot-mutations";
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
import RobotLogs from "./robot-logs";

export default function RobotDetails(initial: RobotContext) {
  const tabId = useId();
  const [tab, setTab] = useState<"overview" | "logs">("overview");
  const { command } = useRobotMutations();
  const pending = command.isPending;
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
    cancelRefresh,
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
    cancelRefresh();
    inFlight.current = true;
    setNotice(null);
    try {
      await command.mutateAsync({ id: robot.id, action });
      setNotice({
        severity: "success",
        message: `${actionLabels[action]} requested.`,
      });
    } catch (error) {
      setNotice({
        severity: "error",
        message: isRequestTimeout(error)
          ? "The command timed out. Its outcome is uncertain; checking reported activity."
          : "Unable to request activity change. Please try again.",
      });
    } finally {
      inFlight.current = false;
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
                  {robotProblemDetails[robot.problemCode].label}.{" "}
                  {robotProblemDetails[robot.problemCode].guidance}
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
          <Tabs
            value={tab}
            onChange={(_event, value: "overview" | "logs") => setTab(value)}
            aria-label="Robot details"
          >
            <Tab
              label="Overview"
              value="overview"
              id={`${tabId}-overview-tab`}
              aria-controls={`${tabId}-overview-panel`}
            />
            <Tab
              label="Logs"
              value="logs"
              id={`${tabId}-logs-tab`}
              aria-controls={`${tabId}-logs-panel`}
            />
          </Tabs>
          <Box
            role="tabpanel"
            id={`${tabId}-overview-panel`}
            aria-labelledby={`${tabId}-overview-tab`}
            hidden={tab !== "overview"}
            tabIndex={0}
          >
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
          </Box>
          <Box
            role="tabpanel"
            id={`${tabId}-logs-panel`}
            aria-labelledby={`${tabId}-logs-tab`}
            hidden={tab !== "logs"}
            tabIndex={0}
          >
            <RobotLogs robot={initial.robot} />
          </Box>
        </>
      )}
      {notice && (
        <ActionNotification {...notice} onClose={() => setNotice(null)} />
      )}
    </Stack>
  );
}
