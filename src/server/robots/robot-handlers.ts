import { robotFiltersSchema } from "@/modules/robots/robot-filters";
import "server-only";

import { robotPageSize } from "@/modules/robots/robot";
import {
  createRobotSchema,
  createRobotBatchSchema,
  robotPageSchema,
  robotPageSizeSchema,
} from "@/modules/robots/robot-validation";

import { errorResponse, jsonResponse } from "../http/responses";
import type { FleetDatabase } from "../db/database";
import {
  createRobots,
  createRobot,
  deleteRobot,
  deleteAllRobots,
  getRobot,
  getRobotContext,
  listRobots,
  robotRegistry,
} from "./robots";

export function robotHandlers(database: () => FleetDatabase) {
  function safely(operation: () => Response) {
    try {
      return operation();
    } catch (reason) {
      console.error("Robot API failed", reason);
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Unable to complete robot request.",
      );
    }
  }

  return {
    registry() {
      return safely(() => jsonResponse({ items: robotRegistry(database()) }));
    },

    list(request: Request) {
      const params = new URL(request.url).searchParams;
      const page = robotPageSchema.safeParse(params.get("page") ?? "0");
      const pageSize = robotPageSizeSchema.safeParse(
        params.get("pageSize") ?? String(robotPageSize),
      );

      if (!pageSize.success) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "Page size must be 10, 20 or 50.",
        );
      }
      if (!page.success) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "Page must be a nonnegative integer.",
        );
      }

      // The schema keeps only its own keys, so page and pageSize drop out.
      const filters = robotFiltersSchema.safeParse(Object.fromEntries(params));

      if (!filters.success) {
        return errorResponse(400, "INVALID_INPUT", "Invalid robot filters.");
      }

      return safely(() =>
        jsonResponse(
          listRobots(database(), page.data, pageSize.data, filters.data),
        ),
      );
    },

    async create(request: Request) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "INVALID_INPUT", "Invalid JSON body.");
      }

      const input = createRobotSchema.safeParse(body);
      if (!input.success) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "Provide name, manufacturer and site (1–100 characters each), and valid robot and integration types.",
        );
      }

      return safely(() =>
        jsonResponse(createRobot(database(), input.data), 201),
      );
    },

    async createBatch(request: Request) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "INVALID_INPUT", "Invalid JSON body.");
      }

      const input = createRobotBatchSchema.safeParse(body);
      if (!input.success) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "Provide between 1 and 100 valid robots.",
        );
      }

      return safely(() =>
        jsonResponse(
          { items: createRobots(database(), input.data.robots) },
          201,
        ),
      );
    },

    get(id: string) {
      return safely(() => {
        const robot = getRobot(database(), id);
        return robot
          ? jsonResponse(robot)
          : errorResponse(404, "NOT_FOUND", "Robot not found.");
      });
    },

    context(id: string) {
      return safely(() => {
        const context = getRobotContext(database(), id);
        return context
          ? jsonResponse(context)
          : errorResponse(404, "NOT_FOUND", "Robot not found.");
      });
    },

    removeAll() {
      return safely(() => {
        deleteAllRobots(database());
        return new Response(null, { status: 204 });
      });
    },

    remove(id: string) {
      return safely(() =>
        deleteRobot(database(), id)
          ? new Response(null, { status: 204 })
          : errorResponse(404, "NOT_FOUND", "Robot not found."),
      );
    },
  };
}
