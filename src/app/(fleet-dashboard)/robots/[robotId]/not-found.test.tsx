import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import RobotNotFound from "./not-found";

test("unknown robot state offers dashboard navigation", () => {
  render(<RobotNotFound />);
  const heading = screen.getByTestId("robot-not-found");
  expect(heading).toHaveRole("heading");
  expect(heading).toHaveAccessibleName("Robot not found");
  const back = screen.getByTestId("robot-not-found-back");
  expect(back).toHaveRole("link");
  expect(back).toHaveAccessibleName("Back to fleet dashboard");
  expect(back).toHaveAttribute("href", "/");
});
