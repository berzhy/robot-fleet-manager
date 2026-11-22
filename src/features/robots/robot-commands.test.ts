import { expect, test } from "vitest";

import type { RobotAction, RobotActivity } from "@/common/robot";
import { testRobot } from "@/test/robots";

import { commandUnavailable, mainActivityAction } from "./robot-commands";

test.each<[RobotActivity | null, RobotAction]>([
  ["working", "stop"],
  ["returning", "stop"],
  ["needs-attention", "retry"],
  ["idle", "start"],
  ["charging", "start"],
  [null, "start"],
])("the main action for a robot that is %s is %s", (activity, action) => {
  expect(mainActivityAction(testRobot({ activity }))).toBe(action);
});

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
