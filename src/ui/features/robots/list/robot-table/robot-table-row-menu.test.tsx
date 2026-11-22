import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/ui/test-render";

import { testRobot, workingRobot } from "@/ui/features/robots/test-robots";

import { robotReading } from "../../robot-reading";
import RobotTableRowMenu from "./robot-table-row-menu";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("disabled actions show their reason and cannot execute", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const evaluatedAt = Date.now();

  render(
    <RobotTableRowMenu
      reading={robotReading(
        testRobot({
          ...workingRobot,
          lastReceivedAt: new Date(evaluatedAt).toISOString(),
        }),
        evaluatedAt,
        false,
      )}
      onDelete={vi.fn()}
    />,
  );

  const trigger = screen.getByRole("button", { name: "Actions for Atlas" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);

  const menu = await screen.findByRole("menu");
  const start = within(menu).getByRole("menuitem", {
    name: "Start activity Already working",
  });
  expect(start).toHaveAttribute("aria-disabled", "true");

  fireEvent.click(start);
  expect(fetcher).not.toHaveBeenCalled();
});

test("a failed refresh does not block actions; the server checks them", async () => {
  const evaluatedAt = Date.now();
  render(
    <RobotTableRowMenu
      reading={robotReading(
        testRobot({
          ...workingRobot,
          lastReceivedAt: new Date(evaluatedAt).toISOString(),
        }),
        evaluatedAt,
        true,
      )}
      onDelete={vi.fn()}
    />,
  );

  const trigger = screen.getByRole("button", { name: "Actions for Atlas" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);

  const stop = within(await screen.findByRole("menu")).getByRole("menuitem", {
    name: "Stop activity",
  });
  expect(stop).not.toHaveAttribute("aria-disabled");
});
