import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useState } from "react";
import type { RobotFilters } from "@/modules/robots/robot-filters";
import FleetFilters from "./fleet-filters";

test("dropdowns, tiles and removable chips share one selection", () => {
  const open = vi.fn();
  function Controls() {
    const [filters, setFilters] = useState<RobotFilters>({ view: "all" });
    return (
      <FleetFilters
        filters={filters}
        onChange={setFilters}
        onOpenChange={open}
        options={{ sites: ["Munich", "Berlin"], manufacturers: ["Maker"] }}
        summary={{
          all: 12,
          offline: 3,
          "needs-attention": 5,
          "low-battery": 2,
        }}
      />
    );
  }
  render(<Controls />);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Location" }));
  fireEvent.click(screen.getByRole("option", { name: "Munich" }));
  expect(open).toHaveBeenCalledWith(true);
  expect(open).toHaveBeenCalledWith(false);
  fireEvent.click(
    screen.getByRole("button", { name: "Needs attention", pressed: false }),
  );
  expect(
    screen.getByRole("button", { name: "Needs attention", pressed: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const chip = screen.getByTestId("fleet-chip-view");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });
  expect(screen.getByRole("button", { name: "All robots" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "All robots" })).toHaveFocus();
  expect(screen.getByText("Location: Munich")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Offline" }));
  expect(screen.getByText("Connection: Offline")).toBeVisible();
  expect(
    within(screen.getByRole("button", { name: "All robots" })).getByText("12"),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.queryByText("Location: Munich")).not.toBeInTheDocument();
  expect(screen.queryByText("Connection: Offline")).not.toBeInTheDocument();
});

test("selecting the active tile does not restart its query", () => {
  const change = vi.fn();
  render(
    <FleetFilters
      filters={{ view: "all" }}
      onChange={change}
      onOpenChange={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "All robots" }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Offline" }));
  expect(change).toHaveBeenCalledWith({ view: "offline" });
});

test("type selection creates a removable chip without clearing other filters", () => {
  function Controls() {
    const [filters, setFilters] = useState<RobotFilters>({
      view: "offline",
      site: "Munich",
    });
    return (
      <FleetFilters
        filters={filters}
        onChange={setFilters}
        onOpenChange={vi.fn()}
        options={{ sites: ["Munich"], manufacturers: [] }}
      />
    );
  }
  render(<Controls />);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Type" }));
  fireEvent.click(screen.getByRole("option", { name: "Inspection robot" }));
  expect(screen.getByText("Type: Inspection robot")).toBeVisible();
  const chip = screen.getByTestId("fleet-chip-type");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });
  expect(screen.queryByText("Type: Inspection robot")).not.toBeInTheDocument();
  expect(screen.getByText("Location: Munich")).toBeVisible();
  expect(screen.getByText("Connection: Offline")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
    "All types",
  );
});
