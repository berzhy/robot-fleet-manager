import { z } from "zod";

import {
  robotFiltersSchema,
  type CreateRobotInput,
  type RobotListParams,
} from "@/common/schemas";
import type {
  Robot,
  RobotAction,
  RobotContext,
  RobotPage,
} from "@/common/types";
import { toSearchParams } from "@/ui/utils/search-params-helpers";

const requestTimeoutMs = 5_000;

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Our routes answer { error: { message } }, but a failure before them can
// answer with anything, so the body is checked rather than trusted.
const errorBodySchema = z.object({
  error: z.object({ message: z.string().optional() }),
});

async function apiError(response: Response, fallbackMessage: string) {
  const body: unknown = await response.json().catch((error: unknown) => {
    // An empty or non-JSON body; a timeout while reading still rejects.
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  });
  const { error } = errorBodySchema.safeParse(body).data ?? {};

  return new ApiError(response.status, error?.message ?? fallbackMessage);
}

export function isRobotNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

/** The robot's latest report rules the action out. */
export function isActionUnavailable(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}

/** A timeout aborts the request in the browser, so there is no response to read. */
export function isRequestTimeout(error: unknown) {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === "TimeoutError"
  );
}

async function request(
  path: string,
  failureMessage: string,
  {
    method,
    json,
    signal,
  }: { method?: "POST" | "DELETE"; json?: unknown; signal?: AbortSignal } = {},
) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    signal: requestSignal(signal),
    ...(json !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    }),
  });
  if (!response.ok) {
    throw await apiError(response, failureMessage);
  }
  return response;
}

function robotPath(id: string) {
  return `/api/robots/${encodeURIComponent(id)}`;
}

export async function getRobots(
  { page, pageSize, ...filters }: RobotListParams,
  signal?: AbortSignal,
): Promise<RobotPage> {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...Object.fromEntries(toSearchParams(robotFiltersSchema, filters)),
  });
  const response = await request(
    `/api/robots?${searchParams}`,
    "Unable to load robots.",
    { signal },
  );
  return response.json() as Promise<RobotPage>;
}

export async function getRobotContext(
  id: string,
  signal?: AbortSignal,
): Promise<RobotContext> {
  const response = await request(
    `${robotPath(id)}/context`,
    "Unable to refresh robot context.",
    { signal },
  );
  return response.json() as Promise<RobotContext>;
}

export async function createRobots(
  robots: CreateRobotInput[],
): Promise<Robot[]> {
  const response = await request("/api/robots/batch", "Unable to add robots.", {
    method: "POST",
    json: { robots },
  });
  const result = (await response.json()) as { items: Robot[] };
  return result.items;
}

export async function sendRobotAction(
  id: string,
  action: RobotAction,
): Promise<Robot> {
  const response = await request(
    `${robotPath(id)}/actions`,
    "Unable to request robot action.",
    { method: "POST", json: { action } },
  );
  return response.json() as Promise<Robot>;
}

export async function deleteRobot(id: string) {
  try {
    await request(robotPath(id), "Unable to delete robot.", {
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
  await request("/api/robots", "Unable to delete all robots.", {
    method: "DELETE",
  });
}
