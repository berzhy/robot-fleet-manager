import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { Robot } from "@/modules/robots/robot";
import RobotDetails from "@/features/fleet-dashboard/robot-details/robot-details";

const robot: Robot = {
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
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
  const details = within(screen.getByTestId("robot-details"));
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
    "Type",
    "Integration",
    "Site",
    "Area",
    "Activity",
    "Battery",
    "Connection",
  ]);
  expect(details.getByTestId("robot-integration")).toHaveTextContent(
    /^Vendor API$/,
  );
  expect(details.getByTestId("robot-type")).toHaveTextContent(
    /^Inspection robot$/,
  );
  expect(details.getByTestId("robot-activity")).toHaveTextContent(/^Charging$/);
  expect(details.getByTestId("robot-area")).toHaveTextContent(/^Unknown$/);
  expect(details.getByTestId("robot-battery")).toHaveTextContent(/^Unknown$/);
  expect(details.getByTestId("robot-connection")).toHaveTextContent(
    /^Unknown$/,
  );
});
