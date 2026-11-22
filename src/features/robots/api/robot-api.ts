import { z } from "zod";

import { apiErrorCodes, type ApiErrorCode } from "@/common/api/api-errors";
import type { RobotAction } from "@/common/robots/robot-actions";
import {
  robotFilterSearchParams,
  type RobotListParams,
} from "@/common/robots/robot-list-params";
import type { CreateRobotInput } from "@/common/robots/robot-schemas";
import type { Robot, RobotContext, RobotPage } from "@/common/robots/robot";

const requestTimeoutMs = 5_000;

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** A failed API response, with the server's error code and message when it sent them. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Our routes answer { error: { code, message } }, but a missing route or a proxy
// can answer with anything, so the body is checked rather than trusted.
const errorBodySchema = z.object({
  error: z.object({
    // A code this app does not know still keeps the message.
    code: z.enum(apiErrorCodes).optional().catch(undefined),
    message: z.string().optional(),
  }),
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

  return new ApiError(
    response.status,
    error?.code,
    error?.message ?? fallbackMessage,
  );
}

/** The server reports that the robot does not exist (any more). */
export function isRobotNotFound(error: unknown) {
  return error instanceof ApiError && error.code === "NOT_FOUND";
}

/** A timeout aborts the request in the browser, so there is no response to read. */
export function isRequestTimeout(error: unknown) {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === "TimeoutError"
  );
}

export async function getRobots(
  { page, pageSize, filters }: RobotListParams,
  signal?: AbortSignal,
): Promise<RobotPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...Object.fromEntries(robotFilterSearchParams(filters)),
  });

  const response = await fetch(`/api/robots?${params}`, {
    signal: requestSignal(signal),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await apiError(response, "Unable to load robots.");
  }
  return response.json() as Promise<RobotPage>;
}

export async function deleteRobot(id: string) {
  const response = await fetch(`/api/robots/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal: requestSignal(),
  });
  if (response.status === 204) {
    return "deleted";
  }

  const error = await apiError(response, "Unable to delete robot.");
  // Checked by code, not status: a 404 from a missing route is a failure, not a removal.
  if (isRobotNotFound(error)) {
    return "already-removed";
  }
  throw error;
}

export async function createRobots(
  robots: CreateRobotInput[],
): Promise<Robot[]> {
  const response = await fetch("/api/robots/batch", {
    method: "POST",
    signal: requestSignal(),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ robots }),
  });
  if (response.status !== 201) {
    throw await apiError(response, "Unable to add robots.");
  }
  const result = (await response.json()) as { items: Robot[] };
  return result.items;
}

export async function sendRobotAction(
  id: string,
  action: RobotAction,
): Promise<void> {
  const response = await fetch(
    `/api/robots/${encodeURIComponent(id)}/actions`,
    {
      method: "POST",
      signal: requestSignal(),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
  if (response.status !== 202) {
    throw await apiError(response, "Unable to request robot action.");
  }
}

export async function getRobotContext(
  id: string,
  signal?: AbortSignal,
): Promise<RobotContext> {
  const response = await fetch(
    `/api/robots/${encodeURIComponent(id)}/context`,
    { cache: "no-store", signal: requestSignal(signal) },
  );
  if (!response.ok) {
    throw await apiError(response, "Unable to refresh robot context.");
  }
  return response.json() as Promise<RobotContext>;
}

export async function deleteAllRobots(): Promise<void> {
  const response = await fetch("/api/robots", {
    method: "DELETE",
    signal: requestSignal(),
  });
  if (response.status !== 204) {
    throw await apiError(response, "Unable to delete all robots.");
  }
}
