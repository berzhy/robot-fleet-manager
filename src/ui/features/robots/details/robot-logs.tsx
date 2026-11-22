import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { integrationTypeLabels, robotTypeLabels } from "@/common/labels";
import type { Robot } from "@/common/types";
import { monospaceFontFamily } from "@/ui/theme/theme";

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
      {sampleLogs(robot).map((entry) => (
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

// Placeholder lines until robots send real logs.
type LogEntry = { time: string; level: "INFO" | "WARN"; message: string };

function sampleLogs(robot: Robot): LogEntry[] {
  return [
    { time: "09:41:00", level: "INFO", message: `Initializing ${robot.name}` },
    {
      time: "09:41:01",
      level: "INFO",
      message: `Robot profile loaded: ${robot.manufacturer} · ${robotTypeLabels[robot.type]}`,
    },
    {
      time: "09:41:02",
      level: "INFO",
      message: "Robot connection established",
    },
    {
      time: "09:41:03",
      level: "INFO",
      message: `Integration initialized: ${integrationTypeLabels[robot.integrationType]}`,
    },
    {
      time: "09:41:04",
      level: "INFO",
      message: `Location configuration loaded: ${robot.site}`,
    },
    { time: "09:41:05", level: "INFO", message: "Sensor health check started" },
    { time: "09:41:06", level: "WARN", message: "Sensor response delayed" },
    { time: "09:41:07", level: "INFO", message: "Retrying sensor connection" },
    {
      time: "09:41:08",
      level: "INFO",
      message: "Sensor communication restored",
    },
    {
      time: "09:41:09",
      level: "INFO",
      message: "Sensor health check completed",
    },
    {
      time: "09:41:10",
      level: "INFO",
      message: "Telemetry channel initialized",
    },
    { time: "09:41:11", level: "INFO", message: "Startup checks completed" },
  ];
}
