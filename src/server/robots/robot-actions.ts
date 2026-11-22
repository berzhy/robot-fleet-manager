import "server-only";
import { eq, sql } from "drizzle-orm";
import type { RobotAction } from "@/common/robot";
import type { FleetDatabase } from "../db/database";
import { robots } from "../db/schema";
import { actionControlTargets } from "./robot-status";
import { getRobot } from "./robots";

type RobotActionRequest =
  | { outcome: "requested" }
  | { outcome: "not-found" }
  | { outcome: "unavailable"; reason: string };

/** Records the action as the robot's new control target, if its state allows it. */
export function requestRobotAction(
  db: FleetDatabase,
  id: string,
  action: RobotAction,
): RobotActionRequest {
  return db.transaction((tx) => {
    const robot = getRobot(tx, id);
    if (!robot) {
      return { outcome: "not-found" };
    }

    const reason = robot.blockedActions[action];
    if (reason) {
      return { outcome: "unavailable", reason };
    }

    tx.update(robots)
      .set({
        controlTarget: actionControlTargets[action],
        controlRevision: sql`${robots.controlRevision} + 1`,
      })
      .where(eq(robots.id, id))
      .run();
    return { outcome: "requested" };
  });
}
