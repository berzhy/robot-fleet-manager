import "server-only";

import { robotPageSize } from "@/modules/robots/robot";
import { robotFiltersSchema } from "@/modules/robots/robot-filters";
import {
  createRobotBatchSchema,
  robotActionRequestSchema,
  robotPageSchema,
  robotPageSizeSchema,
} from "@/modules/robots/robot-validation";

import { readJsonBody } from "../http/requests";
import { errorResponse, jsonResponse } from "../http/responses";
import type { FleetDatabase } from "../db/database";
import { requestRobotAction } from "./robot-actions";
import {
  createRobots,
  deleteRobot,
  deleteAllRobots,
  getRobotContext,
  listRobots,
  robotRegistry,
} from "./robots";

export function robotHandlers(database: () => FleetDatabase) {
  function safely(
    operation: () => Response,
    failureMessage = "Unable to complete robot request.",
  ) {
    try {
      return operation();
    } catch (reason) {
      console.error("Robot API failed", reason);
      return errorResponse(500, "INTERNAL_ERROR", failureMessage);
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

    async createBatch(request: Request) {
      const input = createRobotBatchSchema.safeParse(
        await readJsonBody(request),
      );
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

    async requestAction(id: string, request: Request) {
      const input = robotActionRequestSchema.safeParse(
        await readJsonBody(request),
      );
      if (!input.success) {
        return errorResponse(400, "INVALID_INPUT", "Invalid robot action.");
      }

      return safely(() => {
        const result = requestRobotAction(database(), id, input.data.action);
        switch (result.outcome) {
          case "requested":
            return new Response(null, { status: 202 });
          case "not-found":
            return errorResponse(404, "NOT_FOUND", "Robot not found.");
          case "unavailable":
            return errorResponse(409, "ACTION_UNAVAILABLE", result.reason);
        }
      }, "Unable to request robot action.");
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
