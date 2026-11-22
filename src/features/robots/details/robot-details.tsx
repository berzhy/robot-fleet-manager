"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import NextLink from "next/link";

import type { RobotContext } from "@/modules/robots/robot";

import {
  usePendingRobotAction,
  useRobotWriteLock,
} from "../api/robot-mutations";
import { robotListHref } from "../list/use-robot-list-view";
import useRobotCommand from "../use-robot-command";

import ActivityControls from "./activity-controls";
import RobotDetailsTabs from "./robot-details-tabs";
import RobotSummary from "./robot-summary";
import useLiveRobot from "./use-live-robot";

export default function RobotDetails({
  initialContext,
}: {
  initialContext: RobotContext;
}) {
  const requestAction = useRobotCommand();
  const { isWritePending } = useRobotWriteLock();
  const pendingAction = usePendingRobotAction(initialContext.robot.id);
  const { robot, siteRobots, missing, refreshFailed, evaluatedAt } =
    useLiveRobot(initialContext);

  return (
    <Stack
      data-testid="robot-details"
      spacing={3}
      sx={{ width: "100%", maxWidth: 1440, mx: "auto" }}
    >
      <Link
        component={NextLink}
        href={robotListHref()}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          alignSelf: "flex-start",
        }}
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
      {!missing && (
        <RobotDetailsTabs
          robot={robot}
          peers={siteRobots}
          evaluatedAt={evaluatedAt}
          unverified={refreshFailed}
        />
      )}
    </Stack>
  );
}
