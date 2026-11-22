import {
  act,
  fireEvent,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { expect, test } from "vitest";

import {
  NotificationProvider,
  useNotifications,
} from "./notification-provider";

function renderNotifications() {
  return renderHook(() => useNotifications(), {
    wrapper: NotificationProvider,
  }).result;
}

test("success is announced as a status and error as an alert", () => {
  const notifications = renderNotifications();

  act(() =>
    notifications.current.show({ severity: "success", message: "Saved." }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Saved.");

  act(() =>
    notifications.current.show({ severity: "error", message: "Failed." }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Failed.");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("the close button and clear() both remove the notice", () => {
  const notifications = renderNotifications();

  act(() =>
    notifications.current.show({ severity: "error", message: "Failed." }),
  );
  fireEvent.click(
    within(screen.getByRole("alert")).getByRole("button", { name: "Close" }),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();

  act(() =>
    notifications.current.show({ severity: "error", message: "Failed." }),
  );
  act(() => notifications.current.clear());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("useNotifications outside the provider explains what is missing", () => {
  expect(() => renderHook(() => useNotifications())).toThrow(
    "useNotifications needs a NotificationProvider.",
  );
});
