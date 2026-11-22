import { expect, test } from "vitest";

import { testRobot } from "@/ui/features/robots/test-robots";

import { commandUnavailable } from "./use-robot-command";

test("a queued command blocks only itself", () => {
  const robot = testRobot({
    activity: "idle",
    area: "Lobby",
    batteryPercent: 80,
    lastReceivedAt: new Date().toISOString(),
    queuedControlTarget: "work",
  });

  expect(commandUnavailable(robot, "start")).toBe("Waiting for the robot…");
  // Another command can always replace the queued one.
  expect(commandUnavailable(robot, "return-to-base")).toBeNull();
});

test("a queued command to a disconnected robot shows the connection instead", () => {
  const robot = testRobot({ activity: "idle", queuedControlTarget: "work" });

  expect(commandUnavailable(robot, "start")).toBe("Robot isn't connected");
});
