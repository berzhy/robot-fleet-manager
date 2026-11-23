import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";

import type { RobotPage } from "@/common/types";
import { render } from "@/ui/test-render";

import { testRobotPage } from "@/ui/features/robots/test-robots";

import useRobotListParams from "../robot-list-url-params";
import useRobotList from "../use-robot-list";
import RobotListFilters from "./robot-list-filters";
import RobotStatusFilters from "./robot-status-filters";

const filterPage: RobotPage = testRobotPage([], {
  total: 12,
  summary: { all: 12, offline: 3, "needs-attention": 5, "low-battery": 2 },
  filterOptions: { sites: ["Munich", "Berlin"], manufacturers: ["Maker"] },
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Renders filters for a URL view, with the robot API answering `filterPage`. */
function renderFilters(ui: ReactNode, query = "") {
  window.history.replaceState(null, "", `/robots${query}`);
  const fetcher = vi.fn(() => Promise.resolve(Response.json(filterPage)));
  vi.stubGlobal("fetch", fetcher);
  render(ui);
  return fetcher;
}

async function filterOptionsLoaded() {
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Location" }),
    ).not.toHaveAttribute("aria-disabled", "true"),
  );
}

// The filters as the list screen feeds them: the URL's view and its page of robots.
function StatusFilters() {
  const params = useRobotListParams();
  const { data, isLoading, loadFailed } = useRobotList(params);
  return (
    <RobotStatusFilters
      view={params.view}
      summary={data?.summary}
      isLoading={isLoading}
      loadFailed={loadFailed}
    />
  );
}

function ListFilters() {
  const { page, pageSize, ...filters } = useRobotListParams();
  const { data } = useRobotList({ page, pageSize, ...filters });
  return <RobotListFilters filters={filters} available={data?.filterOptions} />;
}

test("dropdowns, tiles and removable chips share one selection", async () => {
  renderFilters(
    <>
      <StatusFilters />
      <ListFilters />
    </>,
  );
  await filterOptionsLoaded();

  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Location" }));
  fireEvent.click(screen.getByRole("option", { name: "Munich" }));

  expect(screen.getByText("Location: Munich")).toBeVisible();

  fireEvent.click(
    screen.getByRole("button", { name: /Needs attention$/, pressed: false }),
  );

  expect(
    screen.getByRole("button", { name: /Needs attention$/, pressed: true }),
  ).toHaveAttribute("aria-pressed", "true");

  const chip = screen.getByTestId("fleet-chip-view");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });

  expect(screen.getByRole("button", { name: /All robots$/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: /All robots$/ })).toHaveFocus();
  expect(screen.getByText("Location: Munich")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: /Offline$/ }));

  expect(screen.getByText("Status: Offline")).toBeVisible();
  expect(
    within(screen.getByRole("button", { name: /All robots$/ })).getByText("12"),
  ).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

  expect(screen.queryByText("Location: Munich")).not.toBeInTheDocument();
  expect(screen.queryByText("Status: Offline")).not.toBeInTheDocument();
});

test("selecting the active tile does not restart its query", async () => {
  const fetcher = renderFilters(<StatusFilters />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());

  fireEvent.click(screen.getByRole("button", { name: /All robots$/ }));

  expect(window.location.search).toBe("");
  expect(fetcher).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole("button", { name: /Offline$/ }));

  expect(window.location.search).toBe("?view=offline");
});

test("type selection creates a removable chip without clearing other filters", async () => {
  renderFilters(<ListFilters />, "?site=Munich&view=offline");
  await filterOptionsLoaded();

  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Type" }));
  fireEvent.click(screen.getByRole("option", { name: "Inspection robot" }));

  expect(screen.getByText("Type: Inspection robot")).toBeVisible();

  const chip = screen.getByTestId("fleet-chip-type");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });

  expect(screen.queryByText("Type: Inspection robot")).not.toBeInTheDocument();
  expect(screen.getByText("Location: Munich")).toBeVisible();
  expect(screen.getByText("Status: Offline")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
    "All types",
  );
});

test("search waits for two characters and debounce, supports composition and clears immediately", async () => {
  vi.useFakeTimers();
  renderFilters(<ListFilters />, "?site=Munich");
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

test("removing the only chip, a search, returns focus to the search box", async () => {
  renderFilters(<ListFilters />, "?search=Robot");

  const chip = screen.getByTestId("fleet-chip-search");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });

  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveValue(
      "",
    ),
  );
  expect(screen.getByRole("textbox", { name: "Search robots" })).toHaveFocus();
});

test("removing the search chip also drops text typed since", async () => {
  vi.useFakeTimers();
  renderFilters(<ListFilters />, "?site=Munich");
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
});

test("more filters opens a named dialog that applies each selection and stays open", async () => {
  renderFilters(<ListFilters />);
  await filterOptionsLoaded();

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
  expect(screen.getByRole("dialog", { name: "More filters" })).toBe(dialog);
  expect(
    within(dialog).getByRole("combobox", { name: "Manufacturer" }),
  ).toHaveTextContent("Maker");

  fireEvent.click(screen.getByRole("button", { name: "Close more filters" }));

  expect(
    screen.queryByRole("dialog", { name: "More filters" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "More filters (1)" }),
  ).toBeVisible();

  const chip = screen.getByTestId("fleet-chip-manufacturer");
  fireEvent.keyDown(chip, { key: "Delete" });
  fireEvent.keyUp(chip, { key: "Delete" });

  expect(screen.queryByText("Manufacturer: Maker")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "More filters" })).toHaveFocus();
});
