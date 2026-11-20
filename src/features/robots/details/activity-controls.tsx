import Box from "@mui/material/Box";
import Button, { buttonClasses } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { visuallyHidden } from "@mui/utils";
import { useId } from "react";

import type { Robot } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";

import { actionIcons } from "../robot-action-icons";

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

  function reason(action: RobotAction) {
    if (pendingAction) {
      return "Sending command…";
    }
    // The write lock covers every robot change, not only this robot's.
    if (pending) {
      return "Another change is in progress";
    }
    if (unverified) {
      return "Waiting for live updates";
    }
    return actionUnavailable(robot, action, evaluatedAt);
  }

  return (
    <Box
      role="group"
      aria-label="Activity controls"
      aria-busy={pending}
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
        isSending={
          pendingAction !== undefined && pendingAction !== "return-to-base"
        }
        onAction={onAction}
      />
      <ActionTile
        action="return-to-base"
        reason={reason("return-to-base")}
        isSending={pendingAction === "return-to-base"}
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
  isSending,
  onAction,
}: {
  action: RobotAction;
  reason: string | null;
  isSending: boolean;
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
          {isSending ? (
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
