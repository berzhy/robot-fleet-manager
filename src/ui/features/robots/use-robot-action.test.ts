import { expect, test } from "vitest";

import { testRobot } from "@/ui/features/robots/test-robots";

import { actionUnavailable } from "./use-robot-action";

test("a queued action blocks only itself", () => {
  const robot = testRobot({
    activity: "idle",
    area: "Lobby",
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
    queuedControlTarget: "work",
  });

  expect(actionUnavailable(robot, "start")).toBe("Waiting for the robot…");
  // Another action can always replace the queued one.
  expect(actionUnavailable(robot, "return-to-base")).toBeNull();
});

test("a queued action to a disconnected robot shows the connection instead", () => {
  const robot = testRobot({ activity: "idle", queuedControlTarget: "work" });

  expect(actionUnavailable(robot, "start")).toBe("Robot isn't connected");
});
