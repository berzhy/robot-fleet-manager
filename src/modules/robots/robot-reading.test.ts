import { expect, test } from "vitest";

import { testRobot } from "@/test/robots";

import { delayedReportMaxAgeMs } from "../telemetry/freshness";

import { batteryLevel, robotReading } from "./robot-reading";

const evaluatedAt = Date.parse("2026-11-14T12:00:00.000Z");

test.each([
  [21, "working", null],
  [20, "returning", "low"],
  [11, "idle", "low"],
  [10, "working", "critical"],
  [5, "charging", null],
  [null, "unknown", null],
] as const)(
  "a %s%% battery while %s is at level %s",
  (batteryPercent, activity, level) => {
    expect(batteryLevel({ batteryPercent, activity })).toBe(level);
  },
);

test("a reading is last known once its report is stale or live updates fail", () => {
  const fresh = testRobot({
    lastReceivedAt: new Date(evaluatedAt).toISOString(),
  });
  const old = testRobot({
    lastReceivedAt: new Date(
      evaluatedAt - delayedReportMaxAgeMs - 1,
    ).toISOString(),
  });

  expect(robotReading(fresh, evaluatedAt, false)).toMatchObject({
    connection: "online",
    isStale: false,
    isLastKnown: false,
  });
  expect(robotReading(fresh, evaluatedAt, true)).toMatchObject({
    connection: "online",
    isStale: false,
    isLastKnown: true,
  });
  expect(robotReading(old, evaluatedAt, false)).toMatchObject({
    connection: "offline",
    isStale: true,
    isLastKnown: true,
  });
});
