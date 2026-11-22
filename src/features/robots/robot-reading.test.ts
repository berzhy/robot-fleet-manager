import { expect, test } from "vitest";

import { offlineAfterMs } from "@/common/constants";
import { testRobot } from "@/test/robots";

import { robotReading } from "./robot-reading";

const evaluatedAt = Date.parse("2026-11-14T12:00:00.000Z");

test("a reading is last known once its report is stale or live updates fail", () => {
  const fresh = testRobot(
    { lastReceivedAt: new Date(evaluatedAt).toISOString() },
    evaluatedAt,
  );
  const old = testRobot(
    {
      lastReceivedAt: new Date(evaluatedAt - offlineAfterMs - 1).toISOString(),
    },
    evaluatedAt,
  );

  expect(robotReading(fresh, evaluatedAt, false)).toMatchObject({
    isStale: false,
    isLastKnown: false,
  });
  expect(robotReading(fresh, evaluatedAt, true)).toMatchObject({
    isStale: false,
    isLastKnown: true,
  });
  expect(robotReading(old, evaluatedAt, false)).toMatchObject({
    isStale: true,
    isLastKnown: true,
  });
});
