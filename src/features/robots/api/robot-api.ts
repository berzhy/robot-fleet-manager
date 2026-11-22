import { z } from "zod";

import type { RobotAction } from "@/common/robot-actions";
import type { CreateRobotInput } from "@/common/robot-schemas";
import type { Robot, RobotContext, RobotPage } from "@/common/robot";

import {
  robotFilterSearchParams,
  type RobotListParams,
} from "../list/robot-list-params";

const requestTimeoutMs = 5_000;

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** A failed API response, with the server's message when it sent one. */
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

/** The robot does not exist (any more). */
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
