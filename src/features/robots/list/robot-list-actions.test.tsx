import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/test/render";

import { pageMetadata, workingRobot } from "@/test/robots";
import RobotList from "./robot-list";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function openMenu(robotName = "Atlas") {
  const trigger = await screen.findByRole("button", {
    name: `Actions for ${robotName}`,
  });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  return screen.findByRole("menu");
}

test.each([
  [202, "Stop activity requested for"],
  [409, "Robot isn't connected. Check the latest report"],
  [500, "Unable to request stop activity for"],
])(
  "Stop request response %s notifies without changing reported activity",
  async (status, notification) => {
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          status === 409
            ? Response.json(
                { error: { message: "Robot isn't connected" } },
                { status },
              )
            : new Response(null, { status }),
        );
      }
      return Promise.resolve(
        Response.json({
          items: [
            { ...workingRobot, lastReceivedAt: new Date().toISOString() },
          ],
          page: 0,
          pageSize: 20,
          ...pageMetadata(1),
          total: 1,
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(<RobotList />);

    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Stop activity" }),
    );

    const notice = await screen.findByTestId("fleet-notification");
    expect(notice).toHaveTextContent(notification);
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

test("a command holds up only its own robot, without replacing the table", async () => {
  let finish!: (response: Response) => void;
  const reportedNow = new Date().toISOString();
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return Promise.resolve(
      Response.json({
        items: [
          { ...workingRobot, lastReceivedAt: reportedNow },
          {
            ...workingRobot,
            id: "other",
            name: "Bolt",
            lastReceivedAt: reportedNow,
          },
        ],
        total: 2,
        page: 0,
        pageSize: 20,
        ...pageMetadata(2),
      }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(<RobotList />);

  const trigger = await screen.findByRole("button", {
    name: "Actions for Atlas",
  });
  trigger.focus();
  const menu = await openMenu();
  const row = screen.getByTestId("robot-row-control");
  fireEvent.click(
    within(menu).getByRole("menuitem", { name: "Stop activity" }),
  );
  // Keyboard users keep their place in the row while the command is sent.
  await waitFor(() => expect(trigger).toHaveFocus());

  const pendingMenu = await openMenu();
  expect(
    within(pendingMenu).getByRole("menuitem", { name: /Start activity/ }),
  ).toHaveTextContent("Sending command…");
  for (const label of ["Start activity", "Stop activity"]) {
    expect(
      within(pendingMenu).getByRole("menuitem", { name: new RegExp(label) }),
    ).toHaveAttribute("aria-disabled", "true");
  }
  expect(
    within(pendingMenu).getByRole("menuitem", { name: "Delete" }),
  ).not.toHaveAttribute("aria-disabled");
  fireEvent.keyDown(pendingMenu, { key: "Escape" });
  expect(screen.getByTestId("robot-row-control")).toBe(row);

  const otherMenu = await openMenu("Bolt");
  expect(
    within(otherMenu).getByRole("menuitem", { name: "Stop activity" }),
  ).not.toHaveAttribute("aria-disabled");
  fireEvent.keyDown(otherMenu, { key: "Escape" });
  expect(screen.getByTestId("fleet-add-robot")).toBeEnabled();
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);

  finish(new Response(null, { status: 202 }));
  expect(await screen.findByTestId("fleet-notification")).toHaveTextContent(
    "Stop activity requested for",
  );
});
