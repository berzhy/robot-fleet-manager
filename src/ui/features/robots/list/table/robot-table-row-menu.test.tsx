import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import type { RobotRow } from "@/server/robots/robot-status";
import { render } from "@/ui/test-render";

import { testRobot, workingRobot } from "@/ui/features/robots/test-robots";

import RobotTableRowMenu from "./robot-table-row-menu";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function reportingRobot(activity: RobotRow["activity"]) {
  return testRobot({
    ...workingRobot,
    activity,
    lastReceivedAt: new Date().toISOString(),
  });
}

async function openMenu() {
  const trigger = screen.getByRole("button", { name: "Actions for Atlas" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);
  return screen.findByRole("menu");
}

test("disabled actions show their reason and cannot execute", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  render(
    <RobotTableRowMenu robot={reportingRobot("charging")} onDelete={vi.fn()} />,
  );

  const menu = await openMenu();
  const returnToBase = within(menu).getByRole("menuitem", {
    name: "Return to base Already charging",
  });
  expect(returnToBase).toHaveAttribute("aria-disabled", "true");

  expect(
    within(menu).getByRole("menuitem", { name: "Start activity" }),
  ).not.toHaveAttribute("aria-disabled");

  fireEvent.click(returnToBase);
  expect(fetcher).not.toHaveBeenCalled();
});

test("one activity item keeps focus when a live update swaps its action", async () => {
  const onDelete = vi.fn();
  const { rerender } = render(
    <RobotTableRowMenu robot={reportingRobot("working")} onDelete={onDelete} />,
  );

  const menu = await openMenu();
  const stop = within(menu).getByRole("menuitem", { name: "Stop activity" });
  stop.focus();

  rerender(
    <RobotTableRowMenu robot={reportingRobot("idle")} onDelete={onDelete} />,
  );

  expect(within(menu).getByRole("menuitem", { name: "Start activity" })).toBe(
    stop,
  );
  expect(stop).toHaveFocus();
  expect(
    within(menu).queryByRole("menuitem", { name: /Stop activity|Retry/ }),
  ).not.toBeInTheDocument();
});
