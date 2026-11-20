import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";

import { formatRobotTimestamp, formatTimeAgo } from "../utils/robot-formatters";

/** A relative time, with the exact one on hover. */
export default function TimeAgo({
  timestamp,
  now,
  sx,
  "data-testid": testId,
}: {
  timestamp: string;
  now: number;
  sx?: SxProps<Theme>;
  "data-testid"?: string;
}) {
  return (
    <Tooltip title={formatRobotTimestamp(timestamp)} describeChild>
      <Box component="time" data-testid={testId} dateTime={timestamp} sx={sx}>
        {formatTimeAgo(timestamp, now)}
      </Box>
    </Tooltip>
  );
}
