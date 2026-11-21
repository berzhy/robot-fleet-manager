import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { render } from "@/query/test-utils";

import RobotNotFound from "./not-found";

test("unknown robot state links back to the robots list", () => {
  render(<RobotNotFound />);
  const heading = screen.getByTestId("robot-not-found");
  expect(heading).toHaveRole("heading");
  expect(heading).toHaveAccessibleName("Robot not found");
  const back = screen.getByTestId("robot-not-found-back");
  expect(back).toHaveRole("link");
  expect(back).toHaveAccessibleName("Back to robots");
  expect(back).toHaveAttribute("href", "/robots");
});
