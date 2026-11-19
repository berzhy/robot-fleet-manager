import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import {
  robotPageSizes,
  type Robot,
  type RobotPage,
} from "@/modules/robots/robot";

import { pageMetadata } from "../../test-fixtures";
import RobotTable from "./robot-table";

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

function robotPage(items: Robot[]): RobotPage {
  return {
    items,
    total: items.length,
    page: 0,
    pageSize: 20,
    ...pageMetadata(items.length),
  };
}

test.each(robotPageSizes)("loading renders %i decorative rows", (pageSize) => {
  const props = {
    snapshot: { ...robotPage([robot]), pageSize },
    page: 0,
    pageSize,
    onPageSizeChange: () => {},
    onPageChange: () => {},
    onRetry: () => {},
    onAdd: () => {},
    adding: false,
    onDelete: () => {},
  };
  const { rerender } = render(
    <RobotTable
      {...props}
      filters={{ view: "needs-attention" }}
      status="loading"
    />,
  );

  const table = screen.getByRole("table", { name: "Robot fleet" });
  const footerCount = screen.getByTestId("fleet-result-count");

  expect(table.querySelectorAll("tbody > tr")).toHaveLength(pageSize);
  expect(within(table).getAllByRole("row")).toHaveLength(1);
  expect(footerCount).not.toHaveTextContent("Newest first");
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent("of 1");

  rerender(
    <RobotTable {...props} filters={{ view: "all" }} status="success" />,
  );

  expect(table.querySelectorAll("tbody > tr")).toHaveLength(1);
  expect(within(table).getByRole("link", { name: robot.name })).toBeVisible();
  expect(footerCount).toHaveTextContent("1 robot · Newest first");
});

test("table renders the supplied server page without slicing or sorting", () => {
  const onPageChange = vi.fn();
  const robotNeedingAttention = {
    ...robot,
    problemCode: "path-blocked",
  } as const;
  const metadata = pageMetadata(42);

  render(
    <RobotTable
      filters={{ view: "needs-attention", site: "Munich" }}
      status="success"
      snapshot={{
        items: [
          {
            ...robotNeedingAttention,
            id: "zulu",
            name: "Zulu robot",
            createdAt: "2026-01-03T00:00:00.000Z",
          },
          {
            ...robotNeedingAttention,
            id: "alpha",
            name: "Alpha robot",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          robotNeedingAttention,
        ],
        total: 23,
        page: 1,
        pageSize: 20,
        ...metadata,
        fleetTotal: 60,
        summary: { ...metadata.summary, "needs-attention": 23 },
      }}
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
    "21–23 of 23",
  );
  expect(screen.getByTestId("fleet-result-count")).toHaveTextContent(
    "23 of 42 matching robots · Newest first",
  );
  expect(
    screen.getAllByTestId("robot-name").map((name) => name.textContent),
  ).toEqual(["Zulu robot", "Alpha robot", robot.name]);

  fireEvent.click(screen.getByTestId("fleet-previous-page"));

  expect(onPageChange).toHaveBeenCalledWith(0);

  const row = within(screen.getByTestId("robot-row-test"));
  expect(row.getByTestId("robot-battery")).toHaveTextContent(/^Unknown$/);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Unknown$/);
});

test("robot names are plain text with one accessible navigation link per row", () => {
  render(
    <RobotTable
      filters={{ view: "all" }}
      snapshot={robotPage([robot])}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={0}
      onPageChange={() => {}}
      status="success"
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
    <RobotTable
      filters={{ view: "all" }}
      snapshot={robotPage([robot])}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={0}
      onPageChange={() => {}}
      status="success"
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
    <RobotTable
      filters={{ view: "all", search: "no-such-robot" }}
      snapshot={{ ...robotPage([]), fleetTotal: 5 }}
      onClearFilters={() => {}}
      onClearSearch={onClearSearch}
      pageSize={20}
      onPageSizeChange={() => {}}
      page={0}
      onPageChange={() => {}}
      status="success"
      onRetry={() => {}}
      onAdd={() => {}}
      adding={false}
      onDelete={() => {}}
    />,
  );

  expect(screen.getByText("No robots match “no-such-robot”.")).toBeVisible();
  expect(
    screen.getByText(
      "Search matches name, manufacturer, location, area, type, integration, activity, problem, connection and battery.",
    ),
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
      <RobotTable
        filters={{ view: "all" }}
        status="success"
        snapshot={robotPage([
          { ...robot, activity: "needs-attention", problemCode },
        ])}
        page={0}
        pageSize={20}
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
