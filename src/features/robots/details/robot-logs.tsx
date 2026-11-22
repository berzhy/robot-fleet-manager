import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { Robot } from "@/common/robot";
import { monospaceFontFamily } from "@/theme/theme";

import { robotLogFixture } from "./robot-log-fixture";

export default function RobotLogs({ robot }: { robot: Robot }) {
  return (
    <Typography
      component="pre"
      variant="body2"
      sx={{
        m: 0,
        minHeight: 320,
        fontFamily: monospaceFontFamily,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {robotLogFixture(robot).map((entry) => (
        <Box component="span" key={entry.time}>
          <Typography component="span" variant="inherit" color="textSecondary">
            {entry.time}
          </Typography>{" "}
          <Typography
            component="span"
            variant="inherit"
            color={entry.level === "WARN" ? "warning" : "textSecondary"}
          >
            {entry.level}
          </Typography>
          {"  "}
          {entry.message}
          {"\n"}
        </Box>
      ))}
    </Typography>
  );
}
