import EvStationIcon from "@mui/icons-material/EvStation";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import StopIcon from "@mui/icons-material/Stop";
import type SvgIcon from "@mui/material/SvgIcon";

import type { Robot, RobotAction } from "@/common/types";

export const actionLabels = {
  start: "Start activity",
  stop: "Stop activity",
  "return-to-base": "Return to base",
  retry: "Retry activity",
} satisfies Record<RobotAction, string>;

export const actionIcons = {
  start: PlayArrowIcon,
  stop: StopIcon,
  // Base is where the charging bays are.
  "return-to-base": EvStationIcon,
  retry: ReplayIcon,
} satisfies Record<RobotAction, typeof SvgIcon>;

/** The obvious next thing for the robot's state: Start, Stop or Retry. */
export function mainActivityAction(robot: Robot): RobotAction {
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
