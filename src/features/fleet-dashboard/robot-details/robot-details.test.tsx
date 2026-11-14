import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { Robot } from "@/features/fleet-dashboard/types/robot";
import RobotDetails from "@/features/fleet-dashboard/robot-details/robot-details";

const robot: Robot = {
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  site: "Munich",
  area: null,
  activity: "charging",
  batteryPercent: null,
};

test("details show fields, missing values, and breadcrumbs", () => {
  render(<RobotDetails robot={robot} />);
  expect(
    screen.getByRole("heading", { level: 1, name: robot.name }),
  ).toBeInTheDocument();
  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(
    within(breadcrumbs).getByRole("link", { name: "Fleet dashboard" }),
  ).toHaveAttribute("href", "/");
  expect(within(breadcrumbs).getByText(robot.name)).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
    "ID",
    "Manufacturer",
    "Site",
    "Area",
    "Activity",
    "Battery",
  ]);
  expect(screen.getByText("Charging")).toBeInTheDocument();
  expect(screen.getAllByText("Unknown")).toHaveLength(2);
});
