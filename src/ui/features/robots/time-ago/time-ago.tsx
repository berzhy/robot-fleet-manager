import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";

import { formatRobotTimestamp, formatTimeAgo } from "../utils/robot-formatters";

/** A relative time, with the exact one on hover, or on focus when focusable. */
export default function TimeAgo({
  timestamp,
  now,
  tabIndex,
  sx,
  "data-testid": testId,
}: {
  timestamp: string;
  now: number;
  tabIndex?: number;
  sx?: SxProps<Theme>;
  "data-testid"?: string;
}) {
  return (
    <Tooltip title={formatRobotTimestamp(timestamp)} describeChild>
      <Box
        component="time"
        data-testid={testId}
        dateTime={timestamp}
        tabIndex={tabIndex}
        sx={sx}
      >
        {formatTimeAgo(timestamp, now)}
      </Box>
    </Tooltip>
  );
}
