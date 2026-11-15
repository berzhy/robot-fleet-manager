import { expect, test } from "vitest";
import { advanceRobot, initializeRobot } from "./simulation";
import type { Robot } from "@/modules/robots/robot";
const robot: Robot = {
  id: "test",
  name: "Test",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastTelemetryAt: null,
  lastReceivedAt: null,
  batteryPercent: null,
  area: null,
  activity: "unknown",
};
test("missing telemetry gets deterministic defaults and no restart catch-up", () => {
  const first = initializeRobot(robot);
  expect(initializeRobot(robot)).toEqual(first);
  expect(first.battery).toBeGreaterThanOrEqual(30);
  expect(first.battery).toBeLessThanOrEqual(95);
  expect(first.elapsed).toBe(0);
  expect(
    initializeRobot({
      ...robot,
      lastTelemetryAt: robot.createdAt,
      batteryPercent: 15,
    }).charging,
  ).toBe(true);
});
test("battery bounds and charging transitions survive large elapsed steps", () => {
  const state = initializeRobot(robot);
  expect(advanceRobot(robot.id, state, 100000, 0)).toMatchObject({
    batteryPercent: 0,
    activity: "charging",
    area: "Dock",
  });
  const charged = advanceRobot(robot.id, state, 100000, 1000);
  expect(charged).toMatchObject({ batteryPercent: 100, activity: "working" });
  expect(charged.area).not.toBe("Dock");
  const area = advanceRobot(robot.id, state, 0, 2000).area;
  expect(advanceRobot(robot.id, state, 30, 32000).area).not.toBe(area);
});
