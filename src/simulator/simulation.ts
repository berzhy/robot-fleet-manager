import type { Robot } from "@/modules/robots/robot";
import type { TelemetryReport } from "@/modules/telemetry/telemetry";
export type SimulatedRobot = {
  battery: number;
  charging: boolean;
  elapsed: number;
  offset: number;
};
const areas = ["Lobby", "Floor 1", "Warehouse"];
export function initializeRobot(robot: Robot): SimulatedRobot {
  const hash = Array.from(robot.id).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  const battery =
    robot.lastTelemetryAt && robot.batteryPercent !== null
      ? robot.batteryPercent
      : 30 + (hash % 66);
  return {
    battery,
    charging: battery <= 20 || (robot.activity === "charging" && battery < 90),
    elapsed: 0,
    offset:
      robot.area && areas.includes(robot.area)
        ? areas.indexOf(robot.area)
        : hash % areas.length,
  };
}
export function advanceRobot(
  id: string,
  state: SimulatedRobot,
  seconds: number,
  now: number,
): TelemetryReport {
  state.elapsed += seconds;
  state.battery = Math.max(
    0,
    Math.min(100, state.battery + seconds * (state.charging ? 0.5 : -0.1)),
  );
  if (state.battery <= 20) state.charging = true;
  else if (state.battery >= 90) state.charging = false;
  return {
    robotId: id,
    activity: state.charging ? "charging" : "working",
    batteryPercent: state.battery,
    area: state.charging
      ? "Dock"
      : areas[(state.offset + Math.floor(state.elapsed / 30)) % areas.length],
    observedAt: new Date(now).toISOString(),
  };
}
