import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { Robot } from "@/modules/robots/robot";
import FleetDashboard from "./fleet-dashboard";
import RobotActions from "./fleet-table/robot-actions";
const robot: Robot = {
  id: "control",
  name: "Atlas",
  manufacturer: "Maker",
  type: "inspection",
  integrationType: "ros2",
  site: "Site",
  createdAt: new Date().toISOString(),
  area: "Lobby",
  activity: "working",
  batteryPercent: 50,
  lastReceivedAt: new Date().toISOString(),
  lastTelemetryAt: new Date().toISOString(),
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
  problemCode: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function openMenu() {
  const trigger = await screen.findByRole("button", {
    name: "Actions for Atlas",
  });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  return screen.findByRole("menu");
}
test("disabled actions explain their reason on keyboard focus and cannot execute", async () => {
  const onAction = vi.fn();
  render(
    <RobotActions
      robot={{ ...robot, lastReceivedAt: new Date().toISOString() }}
      disabled={false}
      onDelete={vi.fn()}
      onAction={onAction}
    />,
  );
  const menu = await openMenu();
  const start = within(menu).getByRole("menuitem", { name: "Start work" });
  expect(start).toHaveAttribute("aria-disabled", "true");
  fireEvent.focus(start);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Robot is already working",
  );
  fireEvent.click(start);
  expect(onAction).not.toHaveBeenCalled();
});
test.each([202, 409, 500])(
  "Stop request response %s notifies and preserves the current page",
  async (status) => {
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return Promise.resolve(new Response(null, { status }));
      return Promise.resolve(
        Response.json({
          items: [{ ...robot, lastReceivedAt: new Date().toISOString() }],
          page: 0,
          pageSize: 20,
          total: 1,
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(<FleetDashboard />);
    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Stop activity" }),
    );
    const notice = await screen.findByTestId("fleet-notification");
    expect(notice).toHaveTextContent(
      status === 202 ? "Stop requested" : "Unable to request action",
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/robots/control/actions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "stop" }),
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("robot-row-control")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("robot-activity")).toHaveTextContent("Working");
  },
);

test("pending action prevents overlapping mutations without replacing the table", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST")
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Promise.resolve(
      Response.json({
        items: [{ ...robot, lastReceivedAt: new Date().toISOString() }],
        total: 1,
        page: 0,
        pageSize: 20,
      }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(<FleetDashboard />);
  const menu = await openMenu();
  const row = screen.getByTestId("robot-row-control");
  fireEvent.click(
    within(menu).getByRole("menuitem", { name: "Stop activity" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Actions for Atlas" }),
    ).toBeDisabled(),
  );
  expect(screen.getByTestId("fleet-add-robot")).toBeDisabled();
  expect(screen.getByTestId("robot-row-control")).toBe(row);
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
  finish(new Response(null, { status: 202 }));
  expect(await screen.findByTestId("fleet-notification")).toHaveTextContent(
    "Stop requested",
  );
});
