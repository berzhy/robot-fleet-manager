import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/test/render";

import { pageMetadata, workingRobot } from "@/test/robots";
import RobotList from "./robot-list";

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

test.each([202, 409, 500])(
  "Stop request response %s notifies without changing reported activity",
  async (status) => {
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(new Response(null, { status }));
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
    expect(notice).toHaveTextContent(
      status === 202
        ? "Stop activity requested for"
        : "Unable to request stop activity for",
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
    if (init?.method === "POST") {
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return Promise.resolve(
      Response.json({
        items: [{ ...workingRobot, lastReceivedAt: new Date().toISOString() }],
        total: 1,
        page: 0,
        pageSize: 20,
        ...pageMetadata(1),
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

  await waitFor(() =>
    expect(screen.getByTestId("fleet-add-robot")).toBeDisabled(),
  );
  // Keyboard users keep their place in the row while the command is sent.
  await waitFor(() => expect(trigger).toHaveFocus());

  const pendingMenu = await openMenu();
  for (const name of [/Start activity/, /Delete/]) {
    const item = within(pendingMenu).getByRole("menuitem", { name });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("Another change is in progress");
  }
  fireEvent.keyDown(pendingMenu, { key: "Escape" });
  expect(screen.getByTestId("robot-row-control")).toBe(row);
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);

  finish(new Response(null, { status: 202 }));
  expect(await screen.findByTestId("fleet-notification")).toHaveTextContent(
    "Stop activity requested for",
  );
});
