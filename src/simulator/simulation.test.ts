import { expect, test } from "vitest";
import { advanceRobot, initializeRobot, applyControl } from "./simulation";
import type { Robot } from "@/modules/robots/robot";
const robot: Robot = {
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
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

function tick(state: ReturnType<typeof initializeRobot>, seconds: number) {
  let report = advanceRobot(robot.id, state, 0, 0);
  for (let i = 1; i <= seconds; i++)
    report = advanceRobot(robot.id, state, 1, i * 1000);
  return report;
}
test("first report is idle at base and automatic departure waits seven seconds", () => {
  const state = initializeRobot(robot);
  expect(tick(state, 0)).toMatchObject({
    activity: "idle",
    area: "Base",
  });
  expect(tick(state, 6).activity).toBe("idle");
  expect(tick(state, 1).activity).toBe("working");
});
test("low battery returns before charging; automatic charging resumes work", () => {
  const state = initializeRobot({
    ...robot,
    activity: "working",
    batteryPercent: 20.05,
    area: "Lobby",
  });
  expect(tick(state, 1).activity).toBe("returning");
  expect(tick(state, 9).activity).toBe("returning");
  expect(tick(state, 1)).toMatchObject({ activity: "charging", area: "Base" });
  expect(tick(state, 150).activity).toBe("working");
});
test("manual stop overrides low battery and remains held across restart", () => {
  const state = initializeRobot({
    ...robot,
    activity: "returning",
    batteryPercent: 19,
    area: "Lobby",
  });
  const stopped = {
    ...robot,
    controlTarget: "stop" as const,
    controlRevision: 1,
  };
  applyControl(state, stopped);
  const report = tick(state, 100);
  expect(report).toMatchObject({
    activity: "idle",
    area: "Lobby",
    batteryPercent: 19,
    appliedControlRevision: 1,
  });
  const restored = initializeRobot({
    ...stopped,
    activity: report.activity,
    area: report.area,
    batteryPercent: report.batteryPercent,
    appliedControlRevision: 1,
  });
  expect(tick(restored, 20).activity).toBe("idle");
});
test("manual return charges and holds, while start resumes on the next tick", () => {
  const state = initializeRobot({
    ...robot,
    activity: "working",
    area: "Lobby",
    batteryPercent: 80,
  });
  applyControl(state, { ...robot, controlTarget: "base", controlRevision: 1 });
  expect(tick(state, 10).activity).toBe("charging");
  expect(tick(state, 100)).toMatchObject({
    activity: "idle",
    area: "Base",
    batteryPercent: 90,
  });
  applyControl(state, { ...robot, controlTarget: "work", controlRevision: 2 });
  expect(tick(state, 1).activity).toBe("working");
});
test("faults affect a stable minority, accumulate across charging, and Retry recovers", () => {
  const states = Array.from({ length: 1000 }, (_, i) =>
    initializeRobot({ ...robot, id: `robot-${i}` }),
  );
  expect(states.filter((s) => s.hash % 5 === 0)).toHaveLength(200);
  for (const state of states)
    expect(state.faultAfter).toBeGreaterThanOrEqual(120);
  expect(states.every((s) => s.faultAfter <= 2400)).toBe(true);
  const state = states.find((s) => s.hash % 5 === 0)!;
  state.activity = "working";
  state.area = "Lobby";
  state.workingSeconds = state.faultAfter - 1;
  expect(tick(state, 1)).toMatchObject({
    activity: "needs-attention",
    problemCode: "path-blocked",
  });
  const battery = state.battery;
  expect(tick(state, 100).batteryPercent).toBe(battery);
  applyControl(state, { ...robot, controlRevision: 1 });
  expect(tick(state, 1)).toMatchObject({
    activity: "working",
    problemCode: null,
  });
  const accumulated = state.workingSeconds;
  state.activity = "charging";
  state.area = "Base";
  state.battery = 89.5;
  tick(state, 1);
  expect(state.workingSeconds).toBe(accumulated);
});
test.each(["returning", "charging", "needs-attention"] as const)(
  "restart preserves %s and replayed controls do not reset it",
  (activity) => {
    const record = {
      ...robot,
      activity,
      area: "Lobby",
      batteryPercent: 50,
      controlRevision: 2,
      appliedControlRevision: 2,
      problemCode:
        activity === "needs-attention" ? ("path-blocked" as const) : null,
    };
    const state = initializeRobot(record);
    applyControl(state, record);
    expect(tick(state, 0).activity).toBe(activity);
    if (activity === "needs-attention")
      expect(tick(state, 0).problemCode).toBe("path-blocked");
  },
);
test("local acknowledgment survives stale registry data and elapsed catch-up is bounded", () => {
  const state = initializeRobot(robot);
  applyControl(state, { ...robot, controlRevision: 1 });
  state.activity = "needs-attention";
  applyControl(state, {
    ...robot,
    controlRevision: 1,
    appliedControlRevision: 0,
  });
  expect(tick(state, 0).activity).toBe("needs-attention");
  const idle = initializeRobot(robot);
  expect(advanceRobot(robot.id, idle, 100000, 0).activity).toBe("idle");
});

test("initial battery spans 50–100 deterministically and reported battery survives restart", () => {
  const values = Array.from(
    { length: 1000 },
    (_, i) => initializeRobot({ ...robot, id: `battery-${i}` }).battery,
  );
  expect(Math.min(...values)).toBe(50);
  expect(Math.max(...values)).toBe(100);
  expect(initializeRobot(robot).battery).toBe(initializeRobot(robot).battery);
  expect(initializeRobot({ ...robot, batteryPercent: 17 }).battery).toBe(17);
  expect(initializeRobot({ ...robot, batteryPercent: 0 }).battery).toBe(0);
});
