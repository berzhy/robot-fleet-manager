import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  actionUnavailable,
  robotActions,
} from "@/modules/robots/robot-actions";
import type { FleetDatabase } from "../db/database";
import { robots } from "../db/schema";
import { errorResponse } from "../http/responses";
import { getRobot } from "./robots";
const schema = z.strictObject({ action: z.enum(robotActions) });
export async function requestRobotAction(
  db: FleetDatabase,
  id: string,
  request: Request,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Invalid JSON body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return errorResponse(400, "INVALID_INPUT", "Invalid robot action.");
  try {
    return db.transaction((tx) => {
      const robot = getRobot(tx, id);
      if (!robot) return errorResponse(404, "NOT_FOUND", "Robot not found.");
      const reason = actionUnavailable(robot, parsed.data.action, Date.now());
      if (reason) return errorResponse(409, "ACTION_UNAVAILABLE", reason);
      const controlTarget =
        parsed.data.action === "stop"
          ? "stop"
          : parsed.data.action === "return-to-base"
            ? "base"
            : "work";
      tx.update(robots)
        .set({
          controlTarget,
          controlRevision: sql`${robots.controlRevision} + 1`,
        })
        .where(eq(robots.id, id))
        .run();
      return new Response(null, { status: 202 });
    });
  } catch (reason) {
    console.error("Robot action failed", reason);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Unable to request robot action.",
    );
  }
}
