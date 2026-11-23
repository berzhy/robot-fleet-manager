import type { CreateRobotInput } from "@/common/schemas";

import type { FleetDatabase } from "../db/database";
import { createRobots } from "./robots";

/** What a test registers when the details do not matter to it. */
export const testRobotInput: CreateRobotInput = {
  name: "New robot",
  manufacturer: "Maker",
  type: "inspection",
  integrationType: "vendor-api",
  site: "Munich",
};

export function createTestRobot(
  db: FleetDatabase,
  input: CreateRobotInput = testRobotInput,
) {
  return createRobots(db, [input])[0];
}
