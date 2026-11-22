import { expect, test, vi } from "vitest";
import { createRobotSchema } from "@/common/robot-schemas";
import { generateRobotInput } from "./generate-robot-input";
test("generated metadata satisfies the create contract without inventing telemetry", () => {
  const input = generateRobotInput();
  expect(createRobotSchema.parse(input)).toEqual(input);
  expect(input.name).toMatch(/^Robot [0-9A-F]{8}$/);
});

test.each([
  [0, "Samsung", "cleaning"],
  [0.2, "iRobot", "cleaning"],
  [0.4, "LG", "delivery"],
  [0.6, "Ascento", "security"],
  [0.8, "Boston Dynamics", "inspection"],
] as const)(
  "random draw %s generates %s / %s",
  (randomValue, manufacturer, type) => {
    const random = vi.spyOn(Math, "random").mockReturnValue(randomValue);
    try {
      expect(generateRobotInput()).toMatchObject({ manufacturer, type });
    } finally {
      random.mockRestore();
    }
  },
);

test.each([
  [0, "ros2"],
  [0.5, "vda5050"],
  [0.99, "vendor-api"],
] as const)(
  "random draw %s generates %s integration metadata",
  (value, integrationType) => {
    const random = vi.spyOn(Math, "random").mockReturnValue(value);
    try {
      expect(generateRobotInput().integrationType).toBe(integrationType);
    } finally {
      random.mockRestore();
    }
  },
);
