import { expect, test as base, type APIRequestContext } from "@playwright/test";

import type { Robot } from "@/common/robots/robot";
import type { CreateRobotInput } from "@/common/robots/robot-schemas";

export const test = base.extend<{ emptyFleet: void }>({
  emptyFleet: [
    async ({ request }, use) => {
      const response = await request.delete("/api/robots");
      expect(response.status()).toBe(204);
      await use();
    },
    { auto: true },
  ],
});

const defaultRobot: CreateRobotInput = {
  name: "Test robot",
  manufacturer: "Maker",
  type: "inspection",
  integrationType: "ros2",
  site: "Munich",
};

/** Registers robots in one request; each entry overrides what its test checks. */
export async function createRobots(
  request: APIRequestContext,
  robots: Partial<CreateRobotInput>[],
): Promise<Robot[]> {
  const response = await request.post("/api/robots/batch", {
    data: { robots: robots.map((robot) => ({ ...defaultRobot, ...robot })) },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { items: Robot[] }).items;
}
