import type { CreateRobotInput } from "@/common/schemas";

/** What a test registers when the details do not matter to it. */
export const testRobotInput: CreateRobotInput = {
  name: "New robot",
  manufacturer: "Maker",
  type: "inspection",
  integrationType: "vendor-api",
  site: "Munich",
};
