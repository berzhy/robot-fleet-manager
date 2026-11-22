import Box from "@mui/material/Box";
import Button, { buttonClasses } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { visuallyHidden } from "@mui/utils";
import { useId } from "react";

import type { Robot, RobotAction } from "@/common/types";

import { actionIcons, actionLabels } from "../robot-action-display";

const tileSizePx = 120;
const tileIconSizePx = 32;

/**
 * Two controls: one that does the obvious next thing for the robot's state
 * (Start, Stop or Retry), and Return to base.
 */
export default function ActivityControls({
  robot,
  pendingAction,
  unavailableReason,
  onAction,
}: {
  robot: Robot;
  /** The action being sent, if any. */
  pendingAction?: RobotAction;
  unavailableReason: (action: RobotAction) => string | null;
  onAction: (action: RobotAction) => void;
}) {
  const activity = mainActivityAction(robot);
  const isActivityQueued = robot.queuedActions.includes(activity);
  const isReturnQueued = robot.queuedActions.includes("return-to-base");

  return (
    <Box
      role="group"
      aria-label="Activity controls"
      aria-busy={
        pendingAction !== undefined || isActivityQueued || isReturnQueued
      }
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
        reason={unavailableReason(activity)}
        isInProgress={
          (pendingAction !== undefined && pendingAction !== "return-to-base") ||
          isActivityQueued
        }
        onAction={onAction}
      />
      <ActionTile
        action="return-to-base"
        reason={unavailableReason("return-to-base")}
        isInProgress={pendingAction === "return-to-base" || isReturnQueued}
        onAction={onAction}
      />
    </Box>
  );
}

/** The obvious next thing for the robot's state: Start, Stop or Retry. */
function mainActivityAction(robot: Robot): RobotAction {
  switch (robot.activity) {
    case "working":
    case "returning":
      return "stop";
    // Whether there is a problem to retry is Retry's own reason to give.
    case "needs-attention":
      return "retry";
    case "idle":
    case "charging":
    case null:
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
