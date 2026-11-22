import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { render } from "@/ui/test-render";

import { testRobot, workingRobot } from "@/ui/features/robots/test-robots";

import RobotTableRowMenu from "./robot-table-row-menu";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("disabled actions show their reason and cannot execute", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  render(
    <RobotTableRowMenu
      robot={testRobot({
        ...workingRobot,
        lastReceivedAt: new Date().toISOString(),
      })}
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

  expect(
    within(menu).getByRole("menuitem", { name: "Stop activity" }),
  ).not.toHaveAttribute("aria-disabled");

  fireEvent.click(start);
  expect(fetcher).not.toHaveBeenCalled();
});
