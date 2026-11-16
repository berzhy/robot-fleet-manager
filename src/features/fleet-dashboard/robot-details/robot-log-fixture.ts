import type { Robot } from "@/modules/robots/robot";
import {
  formatIntegrationType,
  formatRobotType,
} from "../utils/robot-formatters";

type LogEntry = { time: string; level: "INFO" | "WARN"; message: string };

export function robotLogFixture(robot: Robot): LogEntry[] {
  return [
    { time: "09:41:00", level: "INFO", message: `Initializing ${robot.name}` },
    {
      time: "09:41:01",
      level: "INFO",
      message: `Robot profile loaded: ${robot.manufacturer} · ${formatRobotType(robot.type)}`,
    },
    {
      time: "09:41:02",
      level: "INFO",
      message: "Robot connection established",
    },
    {
      time: "09:41:03",
      level: "INFO",
      message: `Integration initialized: ${formatIntegrationType(robot.integrationType)}`,
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
