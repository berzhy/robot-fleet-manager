import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { visuallyHidden } from "@mui/utils";
import { useId } from "react";

import type { Robot } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";

export default function ActivityControls({
  robot,
  evaluatedAt,
  unverified,
  pending,
  onAction,
}: {
  robot: Robot;
  evaluatedAt: number;
  unverified: boolean;
  pending: boolean;
  onAction: (action: RobotAction) => void;
}) {
  const id = useId();
  const activityAction =
    robot.activity === "working" || robot.activity === "returning"
      ? "stop"
      : "start";
  const actions: RobotAction[] = [activityAction, "retry", "return-to-base"];

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ flexWrap: "wrap" }}
      role="group"
      aria-label="Activity controls"
      aria-busy={pending}
    >
      {actions.map((action) => {
        const reason = pending
          ? "An activity request is in progress"
          : unverified
            ? "Waiting for verified robot data"
            : actionUnavailable(robot, action, evaluatedAt);
        return (
          <Tooltip
            key={action === "start" || action === "stop" ? "activity" : action}
            title={reason ?? ""}
            describeChild
          >
            <Button
              variant={reason ? "outlined" : "contained"}
              disableElevation
              sx={{ opacity: reason ? 0.5 : 1 }}
              aria-label={actionLabels[action]}
              aria-disabled={Boolean(reason)}
              aria-describedby={reason ? `${id}-${action}` : undefined}
              onClick={() => {
                if (!reason) {
                  onAction(action);
                }
              }}
            >
              {actionLabels[action]}
              {reason && (
                <Typography
                  component="span"
                  id={`${id}-${action}`}
                  sx={visuallyHidden}
                >
                  {reason}
                </Typography>
              )}
            </Button>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
