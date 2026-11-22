import {
  connectionStatus,
  isStale,
  type ConnectionStatus,
} from "../telemetry/freshness";

import { criticalBatteryPercent, lowBatteryPercent, type Robot } from "./robot";

export type BatteryLevel = "low" | "critical";

/**
 * A robot as one poll saw it, with what its last report means at that time.
 * Screens render from this rather than each working it out from the poll time.
 */
export type RobotReading = {
  robot: Robot;
  /** When the poll was answered; report ages are measured from it. */
  evaluatedAt: number;
  connection: ConnectionStatus;
  /** The last report is too old to describe the robot now. */
  isStale: boolean;
  /** Live updates failed, so even the connection may have changed since. */
  unverified: boolean;
  /** The reported values may no longer hold: stale or unverified. */
  isLastKnown: boolean;
  batteryLevel: BatteryLevel | null;
};

export function robotReading(
  robot: Robot,
  evaluatedAt: number,
  unverified: boolean,
): RobotReading {
  const connection = connectionStatus(robot.lastReceivedAt, evaluatedAt);
  const stale = isStale(connection);

  return {
    robot,
    evaluatedAt,
    connection,
    isStale: stale,
    unverified,
    isLastKnown: stale || unverified,
    batteryLevel: batteryLevel(robot),
  };
}

/**
 * The band the fleet views count a battery in: Low battery from
 * lowBatteryPercent down, and Needs attention from criticalBatteryPercent
 * down. A charging robot is in neither. The SQL views apply the same rule, and
 * src/server/robots/robots-fleet-views.test.ts checks that they agree.
 */
export function batteryLevel({
  batteryPercent,
  activity,
}: Pick<Robot, "batteryPercent" | "activity">): BatteryLevel | null {
  if (batteryPercent === null || activity === "charging") {
    return null;
  }
  if (batteryPercent <= criticalBatteryPercent) {
    return "critical";
  }
  return batteryPercent <= lowBatteryPercent ? "low" : null;
}
