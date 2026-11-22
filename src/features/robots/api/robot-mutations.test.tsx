import { act } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook } from "@/test/render";

import {
  usePendingRobotAction,
  useRobotWriteLocks,
  useSendRobotAction,
} from "./robot-mutations";

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
    sendToOther: useSendRobotAction("other-robot"),
    sendToThis: useSendRobotAction("this-robot"),
    pendingAction: usePendingRobotAction("this-robot"),
    locks: useRobotWriteLocks(),
  }));

  await act(async () => {
    result.current.sendToOther.mutate("stop");
    await Promise.resolve();
  });
  expect(result.current.pendingAction).toBeUndefined();
  expect(result.current.locks.isCommandPending("this-robot")).toBe(false);
  expect(result.current.locks.isAddLocked()).toBe(false);
  expect(result.current.locks.isDeleteLocked()).toBe(true);

  await act(async () => {
    result.current.sendToThis.mutate("retry");
    await Promise.resolve();
  });
  expect(result.current.pendingAction).toBe("retry");
  expect(result.current.locks.isCommandPending("this-robot")).toBe(true);
});
