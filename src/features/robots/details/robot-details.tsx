"use client";

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
import { useId, useState } from "react";

import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";
import { robotProblemDetails } from "@/modules/robots/robot-problems";
import type { RobotContext } from "@/modules/robots/robot";
import { connectionStatus } from "@/modules/telemetry/freshness";

import ActionNotification from "../action-notification";
import { isRequestTimeout } from "../api/robot-api";
import ConnectionStatus from "../connection-status/connection-status";
import { useRobotCommand, useRobotWriteLock } from "../api/robot-mutations";
import {
  formatActivity,
  formatBattery,
  formatRobotTimestamp,
  formatRobotType,
} from "../utils/robot-formatters";

import ActivityControls from "./activity-controls";
import LocationMap from "./location-map";
import RobotLogs from "./robot-logs";
import RobotProfile from "./robot-profile";
import useLiveRobot from "./use-live-robot";

export default function RobotDetails(initial: RobotContext) {
  const tabId = useId();
  const [tab, setTab] = useState<"overview" | "logs">("overview");
  const command = useRobotCommand();
  const { isWritePending, isWritePendingNow } = useRobotWriteLock();
  const [notice, setNotice] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);
  const {
    robot,
    siteRobots,
    missing,
    refreshFailed,
    verifiedAt: evaluatedAt,
  } = useLiveRobot(initial);

  const connection = connectionStatus(robot.lastReceivedAt, evaluatedAt);
  const stale = connection === "Delayed" || connection === "Offline";

  function act(action: RobotAction) {
    if (isWritePendingNow() || refreshFailed) {
      return;
    }

    const reason = actionUnavailable(robot, action, Date.now());
    if (reason) {
      setNotice({
        severity: "error",
        message: `${reason}. Check the latest report before trying again.`,
      });
      return;
    }

    setNotice(null);

    command.mutate(
      { id: robot.id, action },
      {
        onSuccess: () => {
          setNotice({
            severity: "success",
            message: `${actionLabels[action]} requested.`,
          });
        },
        onError: (error) => {
          setNotice({
            severity: "error",
            message: isRequestTimeout(error)
              ? "The command timed out, so its outcome is uncertain. Check the reported activity before trying again."
              : "Unable to request activity change. Please try again.",
          });
        },
      },
    );
  }

  return (
    <Stack
      data-testid="robot-details"
      spacing={3}
      sx={{ width: "100%", maxWidth: 1440, mx: "auto" }}
    >
      <Breadcrumbs aria-label="Breadcrumb">
        <Link component={NextLink} href="/robots">
          Robots
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
          <Link component={NextLink} href="/robots">
            Back to robots
          </Link>
        </Alert>
      ) : (
        <>
          {refreshFailed && (
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
                      status={connection}
                      unverified={refreshFailed}
                    />
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    {stale || refreshFailed
                      ? "Last reported battery"
                      : "Battery"}
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
                    {stale || refreshFailed
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
              {stale && robot.lastReceivedAt && (
                <Typography variant="body2" color="text.secondary">
                  Telemetry values are last known. Last report{" "}
                  <time dateTime={robot.lastReceivedAt}>
                    {formatRobotTimestamp(robot.lastReceivedAt)}
                  </time>
                  .
                </Typography>
              )}
              {!robot.lastReceivedAt && (
                <Typography variant="body2" color="text.secondary">
                  No reports yet.
                </Typography>
              )}
              <ActivityControls
                robot={robot}
                evaluatedAt={evaluatedAt}
                unverified={refreshFailed}
                pending={isWritePending}
                onAction={act}
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
                evaluatedAt={evaluatedAt}
                unverified={refreshFailed}
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
