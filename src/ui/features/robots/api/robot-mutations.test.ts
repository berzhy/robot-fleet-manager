import { act, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";

import { renderHook } from "@/ui/test-render";
import { testRobot, testRobotPage } from "@/ui/features/robots/test-robots";

import { useDeleteAllRobots, useDeleteRobot } from "./robot-mutations";
import { robotKeys, robotListOptions } from "./robot-queries";

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

test("a write during a first load refreshes with a request sent after the write", async () => {
  const deleted = testRobot({ id: "deleted" });
  let answerFirstLoad!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        answerFirstLoad = resolve;
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValue(Response.json(testRobotPage([])));
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => ({
    list: useQuery(
      robotListOptions({ page: 0, pageSize: 10, filters: { view: "all" } }),
    ),
    deleteRobot: useDeleteRobot(),
  }));

  // The first load was sent before the delete, so it may still list the robot.
  let deletion!: Promise<unknown>;
  act(() => {
    deletion = result.current.deleteRobot.mutateAsync("deleted");
  });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  answerFirstLoad(Response.json(testRobotPage([deleted])));
  await act(() => deletion);

  expect(result.current.list.data?.items).toEqual([]);
});
