import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import RobotNotFound from "./not-found";

test("unknown robot state offers dashboard navigation", () => {
  render(<RobotNotFound />);
  expect(
    screen.getByRole("heading", { name: "Robot not found" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Back to fleet dashboard" }),
  ).toHaveAttribute("href", "/");
});
