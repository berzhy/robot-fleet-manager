import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useRef, useState } from "react";

import type { RobotFilters } from "@/modules/robots/robot-filters";

import RobotListFilters from "./robot-list-filters";
import RobotStatusFilters from "./robot-status-filters";

function useFilters(initial: RobotFilters) {
  const [filters, setFilters] = useState(initial);

  return {
    filters,
    onChange: (changes: Partial<RobotFilters>) =>
      setFilters((current) => ({ ...current, ...changes })),
    onClearFilters: () => setFilters({ view: "all" }),
  };
}

test("dropdowns, tiles and removable chips share one selection", () => {
  function Controls() {
    const { filters, onChange, onClearFilters } = useFilters({ view: "all" });
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
      <>
        <RobotStatusFilters
          filters={filters}
          onChange={onChange}
          summary={{
            all: 12,
            offline: 3,
            "needs-attention": 5,
            "low-battery": 2,
          }}
        />
        <RobotListFilters
          search=""
          searchInputRef={searchInputRef}
          onSearchChange={vi.fn()}
          filters={filters}
          onChange={onChange}
          onClearFilters={onClearFilters}
          options={{ sites: ["Munich", "Berlin"], manufacturers: ["Maker"] }}
        />
      </>
    );
  }
  render(<Controls />);

  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Location" }));
  fireEvent.click(screen.getByRole("option", { name: "Munich" }));

  expect(screen.getByText("Location: Munich")).toBeVisible();

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
  render(<RobotStatusFilters filters={{ view: "all" }} onChange={change} />);

  fireEvent.click(screen.getByRole("button", { name: "All robots" }));

  expect(change).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Offline" }));

  expect(change).toHaveBeenCalledWith({ view: "offline" });
});

test("type selection creates a removable chip without clearing other filters", () => {
  function Controls() {
    const { filters, onChange, onClearFilters } = useFilters({
      view: "offline",
      site: "Munich",
    });
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
      <RobotListFilters
        search=""
        searchInputRef={searchInputRef}
        onSearchChange={vi.fn()}
        filters={filters}
        onChange={onChange}
        onClearFilters={onClearFilters}
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

afterEach(() => vi.useRealTimers());

function SearchControls() {
  const { filters, onChange, onClearFilters } = useFilters({
    view: "all",
    site: "Munich",
  });
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <RobotListFilters
      filters={filters}
      search={search}
      searchInputRef={searchInputRef}
      onSearchChange={setSearch}
      onChange={onChange}
      onClearFilters={onClearFilters}
      options={{ sites: ["Munich"], manufacturers: [] }}
    />
  );
}

test("search waits for two characters and debounce, supports composition and clears immediately", async () => {
  vi.useFakeTimers();
  render(<SearchControls />);
  const field = screen.getByRole("textbox", { name: "Search robots" });

  fireEvent.change(field, { target: { value: "r" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(screen.getByText("Enter at least 2 characters")).toBeVisible();
  expect(screen.queryByTestId("fleet-chip-search")).not.toBeInTheDocument();

  fireEvent.change(field, { target: { value: " robot " } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(299);
  });

  expect(screen.queryByTestId("fleet-chip-search")).not.toBeInTheDocument();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });

  expect(screen.getByText("Search: robot")).toBeVisible();

  fireEvent.compositionStart(field);
  fireEvent.change(field, { target: { value: "Inspection" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });

  expect(screen.getByText("Search: robot")).toBeVisible();

  fireEvent.compositionEnd(field);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  expect(screen.getByText("Search: Inspection")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

  expect(field).toHaveValue("");
  expect(screen.queryByTestId("fleet-chip-search")).not.toBeInTheDocument();
  expect(screen.getByText("Location: Munich")).toBeVisible();
});

test("chip removal and Clear filters cancel pending search", async () => {
  vi.useFakeTimers();
  render(<SearchControls />);
  const field = screen.getByRole("textbox", { name: "Search robots" });

  fireEvent.change(field, { target: { value: "Robot" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

  fireEvent.change(field, { target: { value: "Another" } });

  const chip = screen.getByTestId("fleet-chip-search");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });

  expect(field).toHaveValue("");
  expect(screen.getByTestId("fleet-chip-site")).toHaveFocus();
  expect(screen.queryByTestId("fleet-chip-search")).not.toBeInTheDocument();

  fireEvent.change(field, { target: { value: "Robot" } });

  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });

  expect(field).toHaveValue("");
  expect(screen.queryByTestId("fleet-chip-search")).not.toBeInTheDocument();
  expect(screen.queryByText("Location: Munich")).not.toBeInTheDocument();
});

test("more filters opens a named dialog and applies a selection immediately", () => {
  function Controls() {
    const { filters, onChange, onClearFilters } = useFilters({ view: "all" });
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
      <RobotListFilters
        search=""
        searchInputRef={searchInputRef}
        onSearchChange={vi.fn()}
        filters={filters}
        onChange={onChange}
        onClearFilters={onClearFilters}
        options={{ sites: ["Munich"], manufacturers: ["Maker"] }}
      />
    );
  }
  render(<Controls />);

  const trigger = screen.getByRole("button", { name: "More filters" });
  expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(trigger);

  const dialog = screen.getByRole("dialog", { name: "More filters" });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(trigger).toHaveAttribute("aria-controls", dialog.id);
  expect(dialog).toHaveAttribute("aria-modal", "true");

  fireEvent.mouseDown(
    within(dialog).getByRole("combobox", { name: "Manufacturer" }),
  );
  fireEvent.click(screen.getByRole("option", { name: "Maker" }));

  expect(screen.getByText("Manufacturer: Maker")).toBeVisible();
  expect(
    screen.queryByRole("dialog", { name: "More filters" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "More filters (1)" }),
  ).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "More filters (1)" }));

  expect(
    screen.getByRole("combobox", { name: "Manufacturer" }),
  ).toHaveTextContent("Maker");

  fireEvent.click(screen.getByRole("button", { name: "Close more filters" }));

  const chip = screen.getByTestId("fleet-chip-manufacturer");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });

  expect(screen.queryByText("Manufacturer: Maker")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "More filters" })).toHaveFocus();
});
