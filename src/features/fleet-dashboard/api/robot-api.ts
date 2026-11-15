import type { CreateRobotInput } from "@/modules/robots/robot-validation";
import {
  robotPageSize,
  type Robot,
  type RobotPage,
} from "@/modules/robots/robot";
export async function getRobots(
  page: number,
  pageSize = robotPageSize,
  signal?: AbortSignal,
): Promise<RobotPage> {
  const response = await fetch(
    `/api/robots?page=${page}&pageSize=${pageSize}`,
    {
      signal,
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Unable to load robots.");
  return response.json() as Promise<RobotPage>;
}

export async function deleteRobot(id: string): Promise<void> {
  const response = await fetch(`/api/robots/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response.status !== 204) throw new Error("Unable to delete robot.");
}

export async function createRobot(input: CreateRobotInput): Promise<Robot> {
  const response = await fetch("/api/robots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status !== 201) throw new Error("Unable to add robot.");
  return response.json() as Promise<Robot>;
}

export async function createRobots(
  robots: CreateRobotInput[],
): Promise<Robot[]> {
  const response = await fetch("/api/robots/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ robots }),
  });
  if (response.status !== 201) throw new Error("Unable to add robots.");
  const result = (await response.json()) as { items: Robot[] };
  return result.items;
}

export async function getRobot(
  id: string,
  signal?: AbortSignal,
): Promise<Robot | null> {
  const response = await fetch(`/api/robots/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to refresh robot.");
  return response.json() as Promise<Robot>;
}
