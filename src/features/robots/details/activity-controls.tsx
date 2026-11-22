import Box from "@mui/material/Box";
import Button, { buttonClasses } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { visuallyHidden } from "@mui/utils";
import { useId } from "react";

import type { Robot } from "@/modules/robots/robot";
import { actionLabels, type RobotAction } from "@/modules/robots/robot-actions";

import { actionIcons } from "../robot-action-icons";
import {
  commandUnavailable,
  isActionQueued,
  otherChangePendingReason,
} from "../use-robot-command";

const tileSizePx = 120;
const tileIconSizePx = 32;

/**
 * Two controls: one that does the obvious next thing for the robot's state
 * (Start, Stop or Retry), and Return to base.
 */
export default function ActivityControls({
  robot,
  evaluatedAt,
  unverified,
  pending,
  pendingAction,
  onAction,
}: {
  robot: Robot;
  evaluatedAt: number;
  unverified: boolean;
  pending: boolean;
  pendingAction?: RobotAction;
  onAction: (action: RobotAction) => void;
}) {
  const activity = activityAction(robot);
  const isActivityQueued = isActionQueued(robot, activity, evaluatedAt);
  const isReturnQueued = isActionQueued(robot, "return-to-base", evaluatedAt);

  function reason(action: RobotAction) {
    if (pendingAction) {
      return "Sending command…";
    }
    if (pending) {
      return otherChangePendingReason;
    }
    return commandUnavailable(robot, action, evaluatedAt, unverified);
  }

  return (
    <Box
      role="group"
      aria-label="Activity controls"
      aria-busy={pending || isActivityQueued || isReturnQueued}
      sx={{
        display: "grid",
        gridAutoFlow: { xs: "column", lg: "row" },
        gridAutoColumns: `${tileSizePx}px`,
        gap: 1.5,
      }}
    >
      {/* One element for Start, Stop and Retry, so focus survives the swap. */}
      <ActionTile
        action={activity}
        reason={reason(activity)}
        isInProgress={
          (pendingAction !== undefined && pendingAction !== "return-to-base") ||
          isActivityQueued
        }
        onAction={onAction}
      />
      <ActionTile
        action="return-to-base"
        reason={reason("return-to-base")}
        isInProgress={pendingAction === "return-to-base" || isReturnQueued}
        onAction={onAction}
      />
    </Box>
  );
}

function activityAction(robot: Robot): RobotAction {
  switch (robot.activity) {
    case "working":
    case "returning":
      return "stop";
    // Whether there is a problem to retry is Retry's own reason to give.
    case "needs-attention":
      return "retry";
    case "idle":
    case "charging":
    case "unknown":
      return "start";
  }
}

/** A square tile, the icon above its label; an unavailable one says why on hover or focus. */
function ActionTile({
  action,
  reason,
  isInProgress,
  onAction,
}: {
  action: RobotAction;
  reason: string | null;
  /** Its command is being sent, or is queued until the robot applies it. */
  isInProgress: boolean;
  onAction: (action: RobotAction) => void;
}) {
  const reasonId = useId();
  const Icon = actionIcons[action];

  return (
    <Tooltip title={reason ?? ""} describeChild>
      {/* A disabled look ignores the pointer; the wrapper still gets the hover. */}
      <Box component="span" sx={{ display: "flex" }}>
        <Button
          variant="outlined"
          sx={{
            flexDirection: "column",
            gap: 1,
            width: 1,
            aspectRatio: 1,
            // Room for "Return to base" on one line.
            px: 1,
          }}
          // MUI's disabled look without the disabled attribute: a disabled
          // button drops keyboard focus mid-command (see robot-details.test).
          className={reason ? buttonClasses.disabled : undefined}
          aria-disabled={Boolean(reason)}
          aria-describedby={reason ? reasonId : undefined}
          onClick={() => {
            if (!reason) {
              onAction(action);
            }
          }}
        >
          {isInProgress ? (
            <CircularProgress
              size={tileIconSizePx}
              color="inherit"
              aria-hidden
            />
          ) : (
            <Icon sx={{ fontSize: tileIconSizePx }} />
          )}
          {actionLabels[action]}
        </Button>
        {reason && (
          <Box component="span" id={reasonId} sx={visuallyHidden}>
            {reason}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
