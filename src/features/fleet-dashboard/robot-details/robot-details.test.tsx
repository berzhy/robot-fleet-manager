import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { Robot } from "@/modules/robots/robot";
import RobotDetails from "@/features/fleet-dashboard/robot-details/robot-details";

const robot: Robot = {
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  site: "Munich",
  area: null,
  activity: "charging",
  batteryPercent: null,
  lastTelemetryAt: null,
  lastReceivedAt: null,
  createdAt: "2026-11-14T12:00:00.000Z",
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
    "Connection",
  ]);
  expect(screen.getByText("Charging")).toBeInTheDocument();
  expect(screen.getAllByText("Unknown")).toHaveLength(3);
});
