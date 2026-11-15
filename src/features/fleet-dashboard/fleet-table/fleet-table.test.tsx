import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { Robot } from "@/modules/robots/robot";
import FleetTable from "@/features/fleet-dashboard/fleet-table/fleet-table";

const robot: Robot = {
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
  expect(screen.getByText("21–21 of 21")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }));
  expect(onPageChange).toHaveBeenCalledWith(0);
  expect(screen.getAllByRole("cell", { name: "Unknown" })).toHaveLength(2);
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
