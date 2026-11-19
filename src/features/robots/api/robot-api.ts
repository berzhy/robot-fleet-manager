import type { RobotFilters } from "@/modules/robots/robot-filters";
import type { RobotAction } from "@/modules/robots/robot-actions";
import type { CreateRobotInput } from "@/modules/robots/robot-validation";
import {
  robotPageSize,
  type Robot,
  type RobotPage,
  type RobotContext,
} from "@/modules/robots/robot";

const requestTimeoutMs = 5_000;

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export function isRequestTimeout(error: unknown) {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === "TimeoutError"
  );
}

export async function getRobots(
  page: number,
  pageSize = robotPageSize,
  signal?: AbortSignal,
  filters: RobotFilters = { view: "all" },
): Promise<RobotPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && !(key === "view" && value === "all")) {
      params.set(key, value);
    }
  }

  const response = await fetch(`/api/robots?${params}`, {
    signal: requestSignal(signal),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load robots.");
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

  if (response.status === 404) {
    const body: unknown = await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) {
        return null;
      }
      throw error;
    });
    const error =
      typeof body === "object" && body !== null && "error" in body
        ? body.error
        : null;

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "NOT_FOUND"
    ) {
      return "already-removed";
    }
  }

  throw new Error("Unable to delete robot.");
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
    throw new Error("Unable to add robots.");
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
    throw new Error("Unable to request robot action.");
  }
}

export async function getRobotContext(
  id: string,
  signal?: AbortSignal,
): Promise<RobotContext | null> {
  const response = await fetch(
    `/api/robots/${encodeURIComponent(id)}/context`,
    { cache: "no-store", signal: requestSignal(signal) },
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Unable to refresh robot context.");
  }
  return response.json() as Promise<RobotContext>;
}

export async function deleteAllRobots(): Promise<void> {
  const response = await fetch("/api/robots", {
    method: "DELETE",
    signal: requestSignal(),
  });
  if (response.status !== 204) {
    throw new Error("Unable to delete all robots.");
  }
}
