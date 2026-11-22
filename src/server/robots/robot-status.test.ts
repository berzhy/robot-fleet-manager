import { expect, test } from "vitest";

import { robotActions, type RobotAction } from "@/common/robot";
import { lowBatteryPercent, offlineAfterMs } from "@/common/robot-filters";

import { onlineReportMaxAgeMs, toRobot, type RobotRow } from "./robot-status";

const now = Date.parse("2026-11-14T12:00:00.000Z");

const row: RobotRow = {
  id: "test",
  name: "Test robot",
  manufacturer: "Maker",
  type: "inspection",
  integrationType: "vendor-api",
  site: "Munich",
  createdAt: "2026-11-14T12:00:00.000Z",
  area: null,
  activity: null,
  problemCode: null,
  batteryPercent: null,
  lastReceivedAt: null,
  queuedControlTarget: null,
};

function reportedAgo(ms: number) {
  return new Date(now - ms).toISOString();
}

/** Reporting now, in the field, with charge to spare. */
function connected(overrides: Partial<RobotRow>) {
  return toRobot(
    {
      ...row,
      lastReceivedAt: reportedAgo(0),
      area: "Lobby",
      batteryPercent: 80,
      ...overrides,
    },
    now,
  );
}

test("a robot that has not reported has no connection, battery or activity to go by", () => {
  expect(toRobot(row, now)).toMatchObject({
    connection: null,
    batteryLevel: null,
    activity: null,
  });
});

test.each([
  [0, "online"],
  [onlineReportMaxAgeMs, "online"],
  [onlineReportMaxAgeMs + 1, "delayed"],
  [offlineAfterMs, "delayed"],
  [offlineAfterMs + 1, "offline"],
] as const)("a report %s ms old is %s", (age, connection) => {
  expect(
    toRobot({ ...row, lastReceivedAt: reportedAgo(age) }, now).connection,
  ).toBe(connection);
});

test.each([
  [21, "working", "normal"],
  [20, "returning", "low"],
  [11, "idle", "low"],
  [10, "working", "critical"],
  [5, "charging", "normal"],
] as const)(
  "a %s%% battery while %s is at level %s",
  (batteryPercent, activity, level) => {
    expect(
      toRobot({ ...row, batteryPercent, activity }, now).batteryLevel,
    ).toBe(level);
  },
);

test.each<[RobotAction, Partial<RobotRow>, string | null]>([
  ["start", { activity: "idle" }, null],
  ["start", { activity: "charging" }, null],
  ["start", { activity: "working" }, "Already working"],
  ["start", { activity: "returning" }, "Stop the return first"],
  ["start", { activity: "needs-attention" }, "Use Retry instead"],
  ["start", { activity: null }, "Waiting for the robot's status"],
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
  ["return-to-base", { activity: null }, "Waiting for the robot's status"],
  ["retry", { activity: "needs-attention", problemCode: "path-blocked" }, null],
  ["retry", { activity: "needs-attention" }, "Nothing to retry"],
  ["retry", { activity: "idle" }, "Nothing to retry"],
])("%s with %o: %s", (action, overrides, reason) => {
  expect(connected(overrides).blockedActions[action] ?? null).toBe(reason);
});

test.each([
  ["no reports yet", null],
  ["a delayed report", reportedAgo(onlineReportMaxAgeMs + 1)],
])("a robot with %s refuses every action", (_, lastReceivedAt) => {
  const robot = connected({ activity: "working", lastReceivedAt });
  for (const action of robotActions) {
    expect(robot.blockedActions[action]).toBe("Robot isn't connected");
  }
});

test.each([
  ["work", ["start", "retry"]],
  ["stop", ["stop"]],
  ["base", ["return-to-base"]],
] as const)(
  "a %s command the robot has yet to apply queues %o",
  (queuedControlTarget, actions) => {
    expect(connected({ queuedControlTarget }).queuedActions).toEqual(actions);
  },
);

test("a disconnected robot has nothing queued, since it may never apply it", () => {
  expect(
    connected({ queuedControlTarget: "work", lastReceivedAt: null })
      .queuedActions,
  ).toEqual([]);
});
