import EvStationIcon from "@mui/icons-material/EvStation";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import StopIcon from "@mui/icons-material/Stop";
import type SvgIcon from "@mui/material/SvgIcon";

import type { RobotAction } from "@/common/robots/robot-actions";

export const actionIcons = {
  start: PlayArrowIcon,
  stop: StopIcon,
  // Base is where the charging bays are.
  "return-to-base": EvStationIcon,
  retry: ReplayIcon,
} satisfies Record<RobotAction, typeof SvgIcon>;
