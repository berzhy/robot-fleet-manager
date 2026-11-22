"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import NextLink from "next/link";

import type { RobotContext } from "@/common/types";

import { robotReading } from "../robot-reading";
import { robotListHref } from "../robot-list-return";
import useRobotAction from "../use-robot-action";

import ActivityControls from "./activity-controls";
import RobotDetailsTabs from "./robot-details-tabs";
import RobotSummary from "./robot-summary";
import useLiveRobot from "./use-live-robot";

export default function RobotDetails({
  initialContext,
}: {
  initialContext: RobotContext;
}) {
  const { robot, peerCounts, missing, refreshFailed, evaluatedAt } =
    useLiveRobot(initialContext);
  const { requestAction, pendingAction, unavailableReason } =
    useRobotAction(robot);
  const reading = robotReading(robot, evaluatedAt, refreshFailed);

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
        reading={reading}
        missing={missing}
        actions={
          <ActivityControls
            robot={robot}
            pendingAction={pendingAction}
            unavailableReason={unavailableReason}
            onAction={requestAction}
          />
        }
      />
      {!missing && (
        <RobotDetailsTabs reading={reading} peerCounts={peerCounts} />
      )}
    </Stack>
  );
}
