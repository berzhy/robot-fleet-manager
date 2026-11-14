import type { DemoScenario, Robot } from "../types/robot";
import { robots } from "./robot-fixtures";

export async function getRobots(scenario: DemoScenario): Promise<Robot[]> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  if (scenario === "error") throw new Error("Unable to load robots.");
  return scenario === "empty" ? [] : robots.map((robot) => ({ ...robot }));
}

export function getRobot(id: string): Robot | undefined {
  const robot = robots.find((robot) => robot.id === id);
  return robot ? { ...robot } : undefined;
}
