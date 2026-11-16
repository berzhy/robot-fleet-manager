import { useId } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Robot } from "@/modules/robots/robot";
import {
  actionLabels,
  actionUnavailable,
  robotActions,
  type RobotAction,
} from "@/modules/robots/robot-actions";
export default function ActivityControls({
  robot,
  now,
  unverified,
  pending,
  onAction,
}: {
  robot: Robot;
  now: number;
  unverified: boolean;
  pending: boolean;
  onAction: (action: RobotAction) => void;
}) {
  const id = useId();
  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexWrap: "wrap", gap: 1 }}
        aria-label="Activity controls"
      >
        {robotActions.map((action) => {
          const reason = pending
            ? "An activity request is in progress"
            : unverified
              ? "Waiting for verified robot data"
              : actionUnavailable(robot, action, now);
          return (
            <Tooltip key={action} title={reason ?? ""} describeChild>
              <Button
                variant={reason ? "outlined" : "contained"}
                disableElevation
                sx={{ opacity: reason ? 0.5 : 1 }}
                aria-label={actionLabels[action]}
                aria-disabled={Boolean(reason)}
                aria-describedby={reason ? `${id}-${action}` : undefined}
                onClick={() => {
                  if (!reason) onAction(action);
                }}
              >
                {actionLabels[action]}
                {reason && (
                  <Typography
                    component="span"
                    id={`${id}-${action}`}
                    sx={{
                      position: "absolute",
                      width: "1px",
                      height: "1px",
                      overflow: "hidden",
                      clipPath: "inset(50%)",
                    }}
                  >
                    {reason}
                  </Typography>
                )}
              </Button>
            </Tooltip>
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {pending
          ? "Sending request…"
          : "Activity changes appear after the robot reports them."}
      </Typography>
    </Stack>
  );
}
