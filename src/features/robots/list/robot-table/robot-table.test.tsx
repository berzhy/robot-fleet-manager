import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import {
  robotPageSizes,
  type Robot,
  type RobotPage,
} from "@/modules/robots/robot";

import { render } from "@/query/test-utils";

import { pageMetadata } from "../../test-fixtures";
import { setRobotListFilters } from "../use-robot-list-view";
import RobotTable from "./robot-table";

const robot: Robot = {
  problemCode: null,
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

const tableHandlers = {
  onAdd: () => {},
  onDelete: () => {},
  onFocusSearch: () => {},
  adding: false,
};

afterEach(() => vi.unstubAllGlobals());

function robotPage(items: Robot[]): RobotPage {
  return {
    items,
    total: items.length,
    page: 0,
    pageSize: 20,
    ...pageMetadata(items.length),
  };
}

/** Renders the table for a URL view, with the robot API answering `snapshot`. */
function renderTable(snapshot: RobotPage, query = "") {
  window.history.replaceState(null, "", `/robots${query}`);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(snapshot))),
  );
  render(<RobotTable {...tableHandlers} />);
}

test.each(robotPageSizes)(
  "loading the next view renders %i decorative rows and keeps the pager",
  async (pageSize) => {
    window.history.replaceState(null, "", `/robots?pageSize=${pageSize}`);
    let finishLoading!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.includes("view=needs-attention")
          ? new Promise<Response>((resolve) => {
              finishLoading = resolve;
            })
          : Promise.resolve(Response.json({ ...robotPage([robot]), pageSize })),
      ),
    );
    render(<RobotTable {...tableHandlers} />);

    const table = screen.getByRole("table", { name: "Robot fleet" });
    const footerCount = screen.getByTestId("fleet-result-count");
    expect(
      await within(table).findByRole("link", { name: robot.name }),
    ).toBeVisible();

    act(() => setRobotListFilters({ view: "needs-attention" }));

    expect(table.querySelectorAll("tbody > tr")).toHaveLength(pageSize);
    expect(within(table).getAllByRole("row")).toHaveLength(1);
    expect(footerCount).not.toHaveTextContent("Newest first");
    expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent("of 1");

    await act(async () => {
      finishLoading(Response.json({ ...robotPage([robot]), pageSize }));
      await Promise.resolve();
    });

    expect(
      await within(table).findByRole("link", { name: robot.name }),
    ).toBeVisible();
    expect(table.querySelectorAll("tbody > tr")).toHaveLength(1);
    expect(footerCount).toHaveTextContent("1 of 1 matching robot");
  },
);

test("table renders the supplied server page without slicing or sorting", async () => {
  const robotNeedingAttention = {
    ...robot,
    problemCode: "path-blocked",
  } as const;
  const metadata = pageMetadata(42);

  renderTable(
    {
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
    },
    "?site=Munich&view=needs-attention&pageSize=20&page=1",
  );

  expect(
    await screen.findByRole("link", { name: robot.name }),
  ).toBeInTheDocument();
  expect(screen.getByTestId("fleet-page-summary")).toHaveTextContent(
    "21–23 of 23",
  );
  expect(screen.getByTestId("fleet-result-count")).toHaveTextContent(
    "23 of 42 matching robots · Newest first",
  );
  expect(
    screen.getAllByTestId("robot-name").map((name) => name.textContent),
  ).toEqual(["Zulu robot", "Alpha robot", robot.name]);

  const row = within(screen.getByTestId("robot-row-test"));
  expect(row.getByTestId("robot-battery")).toHaveTextContent(/^Unknown$/);
  expect(row.getByTestId("robot-connection")).toHaveTextContent(/^Unknown$/);

  fireEvent.click(screen.getByTestId("fleet-previous-page"));

  expect(window.location.search).toBe(
    "?site=Munich&view=needs-attention&pageSize=20",
  );
});

test("robot names are plain text with one accessible navigation link per row", async () => {
  renderTable(robotPage([robot]));

  const identity = await screen.findByRole("rowheader");
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

test("columns put identity and operational context before catalog metadata", async () => {
  renderTable(robotPage([robot]));

  const addedAt = await screen.findByTestId("robot-added-at");
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
  expect(addedAt).toHaveAttribute("dateTime", robot.createdAt);
  expect(addedAt).toHaveTextContent("14 Nov 2026");
  expect(addedAt).toHaveTextContent("13:00:00 CET");
});

test("a search with no matches names the query, lists searchable fields and offers Clear search", async () => {
  const onFocusSearch = vi.fn();
  window.history.replaceState(null, "", "/robots?search=no-such-robot");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(Response.json({ ...robotPage([]), fleetTotal: 5 })),
    ),
  );
  render(<RobotTable {...tableHandlers} onFocusSearch={onFocusSearch} />);

  expect(
    await screen.findByText("No robots match “no-such-robot”."),
  ).toBeVisible();
  expect(
    screen.getByText(
      "Search matches name, manufacturer, location, area, type, integration, activity, problem, connection and battery.",
    ),
  ).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

  expect(window.location.search).toBe("");
  expect(onFocusSearch).toHaveBeenCalledOnce();
});

test("a search with no matches mentions other applied filters, which may be the cause", async () => {
  window.history.replaceState(null, "", "/robots?search=sa&view=offline");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(Response.json({ ...robotPage([]), fleetTotal: 5 })),
    ),
  );
  render(<RobotTable {...tableHandlers} />);

  expect(
    await screen.findByText("No robots match “sa” with the selected filters."),
  ).toBeVisible();
});

test.each([
  ["path-blocked", "Path blocked"],
  ["position-lost", "Position lost"],
  ["sensor-obstructed", "Sensor obstructed"],
] as const)(
  "%s shows Needs attention and its concrete reason",
  async (problemCode, label) => {
    renderTable(
      robotPage([{ ...robot, activity: "needs-attention", problemCode }]),
    );

    expect(await screen.findByTestId("robot-activity")).toHaveTextContent(
      `Needs attention${label}`,
    );
  },
);
