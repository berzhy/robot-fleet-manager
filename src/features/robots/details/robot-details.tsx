"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tab, { tabClasses } from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import NextLink from "next/link";
import { useId, useState } from "react";

import {
  usePendingRobotAction,
  useRobotWriteLock,
} from "../api/robot-mutations";
import useRobotCommand from "../use-robot-command";

import ActivityControls from "./activity-controls";
import LocationMap from "./location-map";
import RobotLogs from "./robot-logs";
import RobotSummary from "./robot-summary";
import useLiveRobot from "./use-live-robot";

type DetailsTab = "map" | "logs";

export default function RobotDetails({ robotId }: { robotId: string }) {
  const tabId = useId();
  const [tab, setTab] = useState<DetailsTab>("map");
  const requestAction = useRobotCommand();
  const { isWritePending } = useRobotWriteLock();
  const pendingAction = usePendingRobotAction(robotId);
  const { robot, siteRobots, missing, refreshFailed, evaluatedAt } =
    useLiveRobot(robotId);

  return (
    <Stack
      data-testid="robot-details"
      spacing={3}
      sx={{ width: "100%", maxWidth: 1440, mx: "auto" }}
    >
      <Link
        component={NextLink}
        href="/robots"
        sx={[
          {
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            alignSelf: "flex-start",
          },
          // Straight on the page; see background.default in theme.ts.
          (theme) => theme.applyStyles("light", { color: "primary.dark" }),
        ]}
      >
        <ArrowBackIcon fontSize="small" aria-hidden />
        Back to robots
      </Link>
      {refreshFailed && (
        <Alert data-testid="robot-refresh-warning" severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      <RobotSummary
        robot={robot}
        evaluatedAt={evaluatedAt}
        unverified={refreshFailed}
        missing={missing}
        actions={
          <ActivityControls
            robot={robot}
            evaluatedAt={evaluatedAt}
            unverified={refreshFailed}
            pending={isWritePending}
            pendingAction={pendingAction}
            onAction={(action) => requestAction(robot, action)}
          />
        }
      />
      {/* The tabs belong to their panels, closer than the page's sections. */}
      {!missing && (
        <Box>
          <Tabs
            value={tab}
            onChange={(_event, value: DetailsTab) => setTab(value)}
            aria-label="Robot details"
            // Straight on the page; see background.default in theme.ts.
            sx={(theme) => ({
              mb: 2,
              // As specific as the tab's own selected colour, which it replaces.
              [`& .${tabClasses.root}.${tabClasses.selected}`]:
                theme.applyStyles("light", { color: "primary.dark" }),
            })}
          >
            <Tab
              label="Map"
              value="map"
              id={`${tabId}-map-tab`}
              aria-controls={`${tabId}-map-panel`}
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
            id={`${tabId}-map-panel`}
            aria-labelledby={`${tabId}-map-tab`}
            hidden={tab !== "map"}
            tabIndex={0}
          >
            <LocationMap
              robot={robot}
              peers={siteRobots}
              evaluatedAt={evaluatedAt}
              unverified={refreshFailed}
            />
          </Box>
          <Box
            role="tabpanel"
            id={`${tabId}-logs-panel`}
            aria-labelledby={`${tabId}-logs-tab`}
            hidden={tab !== "logs"}
            tabIndex={0}
          >
            <RobotLogs robot={robot} />
          </Box>
        </Box>
      )}
    </Stack>
  );
}
