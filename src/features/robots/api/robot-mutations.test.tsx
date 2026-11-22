import { act } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook } from "@/test/render";

import { usePendingRobotAction, useSendRobotAction } from "./robot-mutations";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a pending command belongs to its own robot only", async () => {
  // The command never answers, so it stays pending.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
  const { result } = renderHook(() => ({
    sendAction: useSendRobotAction(),
    pendingAction: usePendingRobotAction("this-robot"),
  }));

  await act(async () => {
    result.current.sendAction.mutate({ id: "other-robot", action: "stop" });
    await Promise.resolve();
  });
  expect(result.current.pendingAction).toBeUndefined();

  await act(async () => {
    result.current.sendAction.mutate({ id: "this-robot", action: "retry" });
    await Promise.resolve();
  });
  expect(result.current.pendingAction).toBe("retry");
});
