import "server-only";

import type { z } from "zod";

import {
  createRobotBatchSchema,
  robotActionRequestSchema,
  robotListParamsSchema,
} from "@/common/schemas";

import { readJsonBody } from "../http/requests";
import { errorResponse, jsonResponse } from "../http/responses";
import type { FleetDatabase } from "../db/database";
import { requestRobotAction } from "./robot-actions";
import {
  createRobots,
  deleteRobot,
  deleteAllRobots,
  getRobotSnapshot,
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
      return errorResponse(500, failureMessage);
    }
  }

  return {
    registry() {
      return safely(() => jsonResponse({ items: robotRegistry(database()) }));
    },

    list(request: Request) {
      const { searchParams } = new URL(request.url);
      const params = robotListParamsSchema.safeParse(
        Object.fromEntries(searchParams),
      );

      if (!params.success) {
        return errorResponse(400, invalidListParamsMessage(params.error));
      }

      const { page, pageSize, ...filters } = params.data;

      return safely(() =>
        jsonResponse(listRobots(database(), page, pageSize, filters)),
      );
    },

    async createBatch(request: Request) {
      const input = createRobotBatchSchema.safeParse(
        await readJsonBody(request),
      );
      if (!input.success) {
        return errorResponse(400, "Provide between 1 and 100 valid robots.");
      }

      return safely(() =>
        jsonResponse(
          { items: createRobots(database(), input.data.robots) },
          201,
        ),
      );
    },

    snapshot(id: string) {
      return safely(() => {
        const snapshot = getRobotSnapshot(database(), id);
        return snapshot
          ? jsonResponse(snapshot)
          : errorResponse(404, "Robot not found.");
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
        return errorResponse(400, "Invalid robot action.");
      }

      return safely(() => {
        const result = requestRobotAction(database(), id, input.data.action);
        switch (result.outcome) {
          case "requested":
            return jsonResponse(result.robot, 202);
          case "not-found":
            return errorResponse(404, "Robot not found.");
          case "unavailable":
            return errorResponse(409, result.reason);
        }
      }, "Unable to request robot action.");
    },

    remove(id: string) {
      return safely(() =>
        deleteRobot(database(), id)
          ? new Response(null, { status: 204 })
          : errorResponse(404, "Robot not found."),
      );
    },
  };
}

function invalidListParamsMessage({ issues }: z.ZodError) {
  const fields = issues.map((issue) => issue.path[0]);

  if (fields.includes("pageSize")) {
    return "Page size must be 10, 20 or 50.";
  }
  if (fields.includes("page")) {
    return "Page must be a nonnegative integer.";
  }
  return "Invalid robot filters.";
}
