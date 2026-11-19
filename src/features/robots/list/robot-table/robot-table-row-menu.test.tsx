import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { workingRobot } from "../../test-fixtures";
import RobotTableRowMenu from "./robot-table-row-menu";

afterEach(() => {
  vi.restoreAllMocks();
});

test("disabled actions explain their reason on keyboard focus and cannot execute", async () => {
  const onAction = vi.fn();
  const evaluatedAt = Date.now();

  render(
    <RobotTableRowMenu
      robot={{
        ...workingRobot,
        lastReceivedAt: new Date(evaluatedAt).toISOString(),
      }}
      evaluatedAt={evaluatedAt}
      disabled={false}
      onDelete={vi.fn()}
      onAction={onAction}
    />,
  );

  const trigger = screen.getByRole("button", { name: "Actions for Atlas" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 40, 40),
  );
  fireEvent.click(trigger);

  const menu = await screen.findByRole("menu");
  const start = within(menu).getByRole("menuitem", { name: "Start activity" });
  expect(start).toHaveAttribute("aria-disabled", "true");

  fireEvent.focus(start);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Robot is already working",
  );

  fireEvent.click(start);
  expect(onAction).not.toHaveBeenCalled();
});
