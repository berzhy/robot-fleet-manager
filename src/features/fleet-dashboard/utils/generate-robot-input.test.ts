import { expect, test } from "vitest";
import { createRobotSchema } from "@/modules/robots/robot-validation";
import { generateRobotInput } from "./generate-robot-input";
test("generated metadata satisfies the create contract without inventing telemetry", () => {
  const input = generateRobotInput();
  expect(createRobotSchema.parse(input)).toEqual(input);
  expect(input.name).toMatch(/^Robot [0-9A-F]{8}$/);
});
