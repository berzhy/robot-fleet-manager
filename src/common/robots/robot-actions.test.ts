import { expect, test } from "vitest";

import { testRobot } from "@/test/robots";

import { onlineReportMaxAgeMs } from "../telemetry/freshness";

import { lowBatteryPercent, type Robot, type RobotActivity } from "./robot";
import {
  actionUnavailable,
  commandUnavailable,
  mainActivityAction,
  robotActions,
  type RobotAction,
} from "./robot-actions";
import { robotReading } from "./robot-reading";

const now = Date.parse("2026-11-14T12:00:00.000Z");

/** Reporting now, in the field, with charge to spare. */
function connectedRobot(overrides: Partial<Robot>) {
  return testRobot({
    lastReceivedAt: new Date(now).toISOString(),
    area: "Lobby",
    batteryPercent: 80,
    ...overrides,
  });
}

test.each<[RobotAction, Partial<Robot>, string | null]>([
  ["start", { activity: "idle" }, null],
  ["start", { activity: "charging" }, null],
  ["start", { activity: "working" }, "Already working"],
  ["start", { activity: "returning" }, "Stop the return first"],
  ["start", { activity: "needs-attention" }, "Use Retry instead"],
  ["start", { activity: "unknown" }, "Waiting for the robot's status"],
  [
    "start",
    { activity: "idle", batteryPercent: null },
    "Battery level unknown",
  ],
  [
    "start",
    { activity: "idle", batteryPercent: lowBatteryPercent },
    "Battery too low to start",
  ],
  ["start", { activity: "idle", batteryPercent: lowBatteryPercent + 1 }, null],
  ["stop", { activity: "working" }, null],
  ["stop", { activity: "returning" }, null],
  ["stop", { activity: "idle" }, "Nothing to stop"],
  ["return-to-base", { activity: "working" }, null],
  ["return-to-base", { activity: "idle" }, null],
  ["return-to-base", { activity: "idle", area: "Base" }, "Already at base"],
  [
    "return-to-base",
    { activity: "idle", area: null },
    "Robot's location is unknown",
  ],
  ["return-to-base", { activity: "charging" }, "Already charging"],
  ["return-to-base", { activity: "returning" }, "Already returning"],
  ["return-to-base", { activity: "needs-attention" }, "Fix the problem first"],
  ["return-to-base", { activity: "unknown" }, "Waiting for the robot's status"],
  ["retry", { activity: "needs-attention", problemCode: "path-blocked" }, null],
  ["retry", { activity: "needs-attention" }, "Nothing to retry"],
  ["retry", { activity: "idle" }, "Nothing to retry"],
])("%s with %o: %s", (action, robot, reason) => {
  expect(actionUnavailable(connectedRobot(robot), action, now)).toBe(reason);
});

test.each([
  ["no reports yet", null],
  ["a delayed report", new Date(now - onlineReportMaxAgeMs - 1).toISOString()],
])("a robot with %s refuses every action", (_, lastReceivedAt) => {
  const robot = connectedRobot({ activity: "working", lastReceivedAt });
  for (const action of robotActions) {
    expect(actionUnavailable(robot, action, now)).toBe("Robot isn't connected");
  }
});

test.each<[RobotActivity, RobotAction]>([
  ["working", "stop"],
  ["returning", "stop"],
  ["needs-attention", "retry"],
  ["idle", "start"],
  ["charging", "start"],
  ["unknown", "start"],
])("the main action for a robot that is %s is %s", (activity, action) => {
  expect(mainActivityAction(testRobot({ activity }))).toBe(action);
});

test("a queued command blocks only itself", () => {
  const robot = connectedRobot({
    activity: "idle",
    queuedControlTarget: "work",
  });

  expect(commandUnavailable(robotReading(robot, now, false), "start")).toBe(
    "Waiting for the robot…",
  );
  // Another command can always replace the queued one.
  expect(
    commandUnavailable(robotReading(robot, now, false), "return-to-base"),
  ).toBeNull();
});
