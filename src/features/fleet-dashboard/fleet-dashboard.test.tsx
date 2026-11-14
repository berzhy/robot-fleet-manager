import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import type { Robot } from "@/features/fleet-dashboard/types/robot";
import FleetDashboard from "./fleet-dashboard";
import * as data from "./api/robot-query";

const robot: Robot = {
  id: "test",
  name: "Test robot",
  manufacturer: "Test manufacturer",
  site: "Munich",
  area: null,
  activity: "charging",
  batteryPercent: null,
};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function finishQuery() {
  await act(() => vi.advanceTimersByTimeAsync(1500));
}
function selectScenario(name: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Demo state" }));
  fireEvent.click(screen.getByRole("option", { name }));
}

test("dashboard loads ten robots and reloads", async () => {
  vi.useFakeTimers();
  render(<FleetDashboard />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Fleet dashboard" }),
  ).toBeInTheDocument();
  const loadingStatus = screen.getByRole("status", {
    name: "Fleet loading status",
  });
  expect(loadingStatus).toHaveTextContent("Loading robots");
  const busyRegion = screen.getByRole("table").closest("[aria-busy]");
  expect(busyRegion).toHaveAttribute("aria-busy", "true");
  expect(busyRegion).not.toContainElement(loadingStatus);
  expect(screen.getByRole("button", { name: "Reload" })).toBeDisabled();
  await finishQuery();
  expect(screen.getAllByRole("row")).toHaveLength(11);
  expect(screen.getByRole("link", { name: "Atlas" })).toHaveAttribute(
    "href",
    "/robots/robot-01",
  );
  expect(
    screen.getByRole("button", { name: "Go to next page" }),
  ).toBeDisabled();
  expect(loadingStatus).toHaveTextContent("");
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  expect(screen.getByRole("status", { name: "Fleet loading status" })).toBe(
    loadingStatus,
  );
  expect(loadingStatus).toHaveTextContent("Loading robots");
  await finishQuery();
  expect(screen.getByRole("link", { name: "Atlas" })).toBeInTheDocument();
});

test("selector exposes empty, error, retry, and recovery", async () => {
  vi.useFakeTimers();
  render(<FleetDashboard />);
  selectScenario("Empty");
  await finishQuery();
  expect(screen.getByText("No robots available.")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Go to next page" }),
  ).not.toBeInTheDocument();
  selectScenario("Error");
  expect(
    screen.getByRole("status", { name: "Fleet loading status" }),
  ).toBeInTheDocument();
  await finishQuery();
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to load robots.");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(
    screen.getByRole("status", { name: "Fleet loading status" }),
  ).toBeInTheDocument();
  await finishQuery();
  expect(screen.getByRole("alert")).toBeInTheDocument();
  selectScenario("Success");
  await finishQuery();
  expect(screen.getByRole("link", { name: "Atlas" })).toBeInTheDocument();
});

test("changing demo state resets pagination to the first page", async () => {
  const robots = Array.from({ length: 21 }, (_, i) => ({
    ...robot,
    id: `robot-${i}`,
    name: `Robot ${String(i).padStart(2, "0")}`,
  }));
  vi.spyOn(data, "getRobots")
    .mockResolvedValueOnce(robots)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(robots);
  render(<FleetDashboard />);
  await screen.findByRole("link", { name: "Robot 00" });
  fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
  expect(screen.getByText("21–21 of 21")).toBeInTheDocument();
  selectScenario("Empty");
  await screen.findByText("No robots available.");
  selectScenario("Success");
  await screen.findByRole("link", { name: "Robot 00" });
  expect(screen.getByText("1–20 of 21")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Go to previous page" }),
  ).toBeDisabled();
});
