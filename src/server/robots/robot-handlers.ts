import "server-only";

import { robotPageSize } from "@/modules/robots/robot";
import {
  createRobotSchema,
  createRobotBatchSchema,
  robotPageSchema,
  robotPageSizeSchema,
} from "@/modules/robots/robot-validation";

import type { FleetDatabase } from "../db/database";
import {
  createRobots,
  createRobot,
  deleteRobot,
  getRobot,
  listRobots,
} from "./robots";
function error(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function robotHandlers(database: () => FleetDatabase) {
  function safely(operation: () => Response) {
    try {
      return operation();
    } catch (reason) {
      console.error("Robot API failed", reason);
      return error(500, "INTERNAL_ERROR", "Unable to complete robot request.");
    }
  }
  return {
    list(request: Request) {
      const params = new URL(request.url).searchParams;
      const page = robotPageSchema.safeParse(params.get("page") ?? "0");
      const pageSize = robotPageSizeSchema.safeParse(
        params.get("pageSize") ?? String(robotPageSize),
      );
      if (!pageSize.success)
        return error(400, "INVALID_INPUT", "Page size must be 10, 20 or 100.");
      if (!page.success)
        return error(
          400,
          "INVALID_INPUT",
          "Page must be a nonnegative integer.",
        );
      return safely(() =>
        json(listRobots(database(), page.data, pageSize.data)),
      );
    },
    async create(request: Request) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return error(400, "INVALID_INPUT", "Invalid JSON body.");
      }
      const input = createRobotSchema.safeParse(body);
      if (!input.success)
        return error(
          400,
          "INVALID_INPUT",
          "Provide name, manufacturer and site, each between 1 and 100 characters.",
        );
      return safely(() => json(createRobot(database(), input.data), 201));
    },
    async createBatch(request: Request) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return error(400, "INVALID_INPUT", "Invalid JSON body.");
      }
      const input = createRobotBatchSchema.safeParse(body);
      if (!input.success)
        return error(
          400,
          "INVALID_INPUT",
          "Provide between 1 and 100 valid robots.",
        );
      return safely(() =>
        json({ items: createRobots(database(), input.data.robots) }, 201),
      );
    },
    get(id: string) {
      return safely(() => {
        const robot = getRobot(database(), id);
        return robot
          ? json(robot)
          : error(404, "NOT_FOUND", "Robot not found.");
      });
    },
    remove(id: string) {
      return safely(() =>
        deleteRobot(database(), id)
          ? new Response(null, { status: 204 })
          : error(404, "NOT_FOUND", "Robot not found."),
      );
    },
  };
}
