import type { Robot } from "@/common/robot";

/**
 * A robot as one poll saw it, with what that means for the screen. Screens
 * render from this rather than each working it out.
 */
export type RobotReading = {
  robot: Robot;
  /** When the poll was answered; report ages are measured from it. */
  evaluatedAt: number;
  /** The last report is too old to describe the robot now. */
  isStale: boolean;
  /** Live updates failed, so even the connection may have changed since. */
  unverified: boolean;
  /** The reported values may no longer hold: stale or unverified. */
  isLastKnown: boolean;
};

export function robotReading(
  robot: Robot,
  evaluatedAt: number,
  unverified: boolean,
): RobotReading {
  const isStale =
    robot.connection === "delayed" || robot.connection === "offline";

  return {
    robot,
    evaluatedAt,
    isStale,
    unverified,
    isLastKnown: isStale || unverified,
  };
}
