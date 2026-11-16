import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { Robot } from "@/modules/robots/robot";
import FleetTable from "@/features/fleet-dashboard/fleet-table/fleet-table";

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

test("table renders the supplied server page without slicing or sorting", () => {
  const onPageChange = vi.fn();
  render(
    <FleetTable
      resultCount="21 robots · Newest first"
      state={{ status: "success", robots: [robot] }}
      total={21}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={1}
      onPageChange={onPageChange}
      onRetry={() => {}}
      onAdd={() => {}}
      adding={false}
      onDelete={() => {}}
    />,
  );
  expect(screen.getByRole("link", { name: robot.name })).toBeInTheDocument();
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "21–21 of 21",
  );
  expect(screen.getByTestId("fleet-result-count")).toHaveTextContent(
    "21 robots · Newest first",
  );
  fireEvent.click(screen.getByTestId("fleet-previous-page"));
  expect(onPageChange).toHaveBeenCalledWith(0);
  const row = within(screen.getByTestId("robot-row-test"));
  expect(row.getByTestId("robot-battery")).toHaveTextContent(/^Unknown$/);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Unknown$/);
});

test("robot names are plain text with one accessible navigation link per row", () => {
  render(
    <FleetTable
      total={1}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={0}
      onPageChange={() => {}}
      state={{ status: "success", robots: [robot] }}
      onRetry={() => {}}
      onAdd={() => {}}
      adding={false}
      onDelete={() => {}}
    />,
  );
  const identity = screen.getByRole("rowheader");
  expect(within(identity).getByText(robot.name)).toBeInTheDocument();
  expect(within(identity).getByText(robot.manufacturer)).toBeInTheDocument();
  expect(
    screen.queryByRole("columnheader", { name: "Manufacturer" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Type" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("cell", { name: "Inspection robot" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Integration" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Vendor API" })).toBeInTheDocument();
  expect(screen.getByText(robot.name).closest("a")).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", { name: robot.name })).toHaveAttribute(
    "href",
    `/robots/${robot.id}`,
  );
});

test("columns put identity and operational context before catalog metadata", () => {
  render(
    <FleetTable
      total={1}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={0}
      onPageChange={() => {}}
      state={{ status: "success", robots: [robot] }}
      onRetry={() => {}}
      onAdd={() => {}}
      adding={false}
      onDelete={() => {}}
    />,
  );
  expect(
    screen.getAllByRole("columnheader").map((header) => header.textContent),
  ).toEqual([
    "Robot",
    "Location",
    "Connection",
    "Activity",
    "Battery",
    "Type",
    "Integration",
    "Registered",
    "Actions",
  ]);
  expect(screen.getByTestId("robot-added-at")).toHaveAttribute(
    "dateTime",
    robot.createdAt,
  );
  expect(screen.getByTestId("robot-added-at")).toHaveTextContent("14 Nov 2026");
  expect(screen.getByTestId("robot-added-at")).toHaveTextContent(
    "13:00:00 CET",
  );
});

test("a search with no matches names the query, lists searchable fields and offers Clear search", () => {
  const onClearSearch = vi.fn();
  render(
    <FleetTable
      search="no-such-robot"
      fleetTotal={5}
      onClearFilters={() => {}}
      onClearSearch={onClearSearch}
      total={0}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={0}
      onPageChange={() => {}}
      state={{ status: "success", robots: [] }}
      onRetry={() => {}}
      onAdd={() => {}}
      adding={false}
      onDelete={() => {}}
    />,
  );
  expect(screen.getByText("No robots match “no-such-robot”.")).toBeVisible();
  expect(
    screen.getByText(/Search matches name, ID, manufacturer/),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(onClearSearch).toHaveBeenCalledOnce();
});

test.each([
  ["path-blocked", "Path blocked"],
  ["position-lost", "Position lost"],
  ["sensor-obstructed", "Sensor obstructed"],
] as const)(
  "%s shows Needs attention and its concrete reason",
  (problemCode, label) => {
    render(
      <FleetTable
        state={{
          status: "success",
          robots: [
            {
              ...robot,
              activity: "needs-attention",
              problemCode,
            },
          ],
        }}
        page={0}
        pageSize={20}
        total={1}
        onPageSizeChange={() => {}}
        onPageChange={() => {}}
        onRetry={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        adding={false}
      />,
    );
    expect(screen.getByTestId("robot-activity")).toHaveTextContent(
      `Needs attention${label}`,
    );
  },
);
