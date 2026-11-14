import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { useState } from "react";

import type { Robot } from "@/features/fleet-dashboard/types/robot";
import FleetTable from "@/features/fleet-dashboard/fleet-table/fleet-table";

const robot: Robot = {
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  site: "Munich",
  area: null,
  activity: "charging",
  batteryPercent: null,
};

test("table sorts before paginating twenty rows and displays unknown battery", () => {
  const robots = Array.from({ length: 21 }, (_, i) => ({
    ...robot,
    id: `robot-${i}`,
    name: `Robot ${String(i).padStart(2, "0")}`,
  })).reverse();
  render(<PaginatedTable robots={robots} />);
  expect(
    screen.getAllByRole("columnheader").map((header) => header.textContent),
  ).toEqual(["Robot", "Manufacturer", "Location", "Activity", "Battery"]);
  expect(screen.getAllByRole("row")).toHaveLength(21);
  expect(screen.getAllByRole("link")[0]).toHaveAttribute(
    "aria-label",
    "Robot 00",
  );
  expect(
    screen.queryByRole("link", { name: "Robot 20" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("1–20 of 21")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Go to previous page" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
  expect(screen.getAllByRole("row")).toHaveLength(2);
  expect(screen.getByText("21–21 of 21")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Robot 20" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Unknown" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Go to next page" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }));
  expect(screen.getByText("1–20 of 21")).toBeInTheDocument();
});

test("robot names are plain text with one accessible navigation link per row", () => {
  render(
    <FleetTable
      page={0}
      onPageChange={() => {}}
      state={{ status: "success", robots: [robot] }}
      onRetry={() => {}}
    />,
  );
  expect(screen.getByText(robot.name).closest("a")).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", { name: robot.name })).toHaveAttribute(
    "href",
    `/robots/${robot.id}`,
  );
});

function PaginatedTable({ robots }: { robots: Robot[] }) {
  const [page, setPage] = useState(0);
  return (
    <FleetTable
      state={{ status: "success", robots }}
      page={page}
      onPageChange={setPage}
      onRetry={() => {}}
    />
  );
}
