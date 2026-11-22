import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { render } from "@/ui/test-render";

import RobotNotFound from "./not-found";

test("unknown robot state links back to the robots list", () => {
  render(<RobotNotFound />);

  expect(
    screen.getByRole("heading", { name: "Robot not found", level: 1 }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Back to robots" })).toHaveAttribute(
    "href",
    "/robots",
  );
});
