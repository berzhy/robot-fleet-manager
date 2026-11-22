import { act } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook } from "@/ui/test-render";
import { testRobot, testRobotPage } from "@/ui/features/robots/test-robots";

import { useDeleteAllRobots } from "./robot-mutations";
import { robotKeys } from "./robot-queries";

afterEach(() => vi.unstubAllGlobals());

test("a write drops list pages not on screen but keeps robot details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  const listKey = robotKeys.list({
    page: 1,
    pageSize: 10,
    filters: { view: "all" },
  });
  const contextKey = robotKeys.context("test");
  const { result } = renderHook(
    () => ({ client: useQueryClient(), deleteAll: useDeleteAllRobots() }),
    {
      queryData: [
        [listKey, testRobotPage([testRobot()])],
        [contextKey, { robot: testRobot(), peerCounts: [], evaluatedAt: 0 }],
      ],
    },
  );

  await act(() => result.current.deleteAll.mutateAsync());

  expect(result.current.client.getQueryData(listKey)).toBeUndefined();
  expect(result.current.client.getQueryData(contextKey)).toBeDefined();
});
