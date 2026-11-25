import {
  robotFiltersSchema,
  type CreateRobotInput,
  type RobotListParams,
} from "@/common/schemas";
import type {
  Robot,
  RobotAction,
  RobotSnapshot,
  RobotPage,
} from "@/common/types";
import { ApiError, request, requestJson } from "@/ui/utils/api-request";
import { toSearchParams } from "@/ui/utils/search-params-helpers";

const robotsApiPath = "/api/robots";

function robotApiPath(id: string) {
  return `${robotsApiPath}/${encodeURIComponent(id)}`;
}

export function isRobotNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

/** The robot's latest report rules the action out. */
export function isActionUnavailable(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}

export function getRobots(
  { page, pageSize, ...filters }: RobotListParams,
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...Object.fromEntries(toSearchParams(robotFiltersSchema, filters)),
  });
  return requestJson<RobotPage>(
    `${robotsApiPath}?${searchParams}`,
    "Unable to load robots.",
    { signal },
  );
}

export function getRobotSnapshot(id: string, signal?: AbortSignal) {
  return requestJson<RobotSnapshot>(
    `${robotApiPath(id)}/snapshot`,
    "Unable to refresh robot.",
    { signal },
  );
}

export async function createRobots(robots: CreateRobotInput[]) {
  const { items } = await requestJson<{ items: Robot[] }>(
    `${robotsApiPath}/batch`,
    "Unable to add robots.",
    { method: "POST", json: { robots } },
  );
  return items;
}

export function sendRobotAction(id: string, action: RobotAction) {
  return requestJson<Robot>(
    `${robotApiPath(id)}/actions`,
    "Unable to request robot action.",
    { method: "POST", json: { action } },
  );
}

export async function deleteRobot(id: string) {
  try {
    await request(robotApiPath(id), "Unable to delete robot.", {
      method: "DELETE",
    });
    return "deleted";
  } catch (error) {
    if (isRobotNotFound(error)) {
      return "already-removed";
    }
    throw error;
  }
}

export async function deleteAllRobots() {
  await request(robotsApiPath, "Unable to delete all robots.", {
    method: "DELETE",
  });
}
