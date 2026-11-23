import { act, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { RobotPage } from "@/common/types";
import { renderHook } from "@/ui/test-render";
import { testRobot, testRobotPage } from "@/ui/features/robots/test-robots";

import {
  useDeleteAllRobots,
  useDeleteRobot,
  useSendRobotAction,
} from "./robot-mutations";
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

  await waitFor(() => expect(result.current.list.data?.items).toEqual([]));
});

test("overlapping commands each show their result, and the last refresh wins", async () => {
  const listParams = {
    page: 0,
    pageSize: 10,
    filters: { view: "all" as const },
  };
  const reportedAt = new Date().toISOString();
  const working = { activity: "working" as const, lastReceivedAt: reportedAt };
  const first = testRobot({ ...working, id: "first" });
  const second = testRobot({ ...working, id: "second" });
  const queued = (robot: typeof first) =>
    Response.json(testRobot({ ...robot, queuedControlTarget: "stop" }), {
      status: 202,
    });

  const reads: {
    signal: AbortSignal;
    answer: (response: Response) => void;
  }[] = [];
  const writes = new Map<string, (response: Response) => void>();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve) => {
          if (init.method === "POST") {
            writes.set(url, resolve);
          } else {
            reads.push({ signal: init.signal!, answer: resolve });
          }
        }),
    ),
  );
  const { result } = renderHook(
    () => ({
      list: useQuery(robotListOptions(listParams)),
      stopFirst: useSendRobotAction("first"),
      stopSecond: useSendRobotAction("second"),
    }),
    {
      queryData: [[robotKeys.list(listParams), testRobotPage([first, second])]],
    },
  );
  const queuedIds = () =>
    result.current.list.data?.items
      .filter((robot) => robot.queuedActions.length > 0)
      .map((robot) => robot.id);

  await waitFor(() => expect(reads).toHaveLength(1));
  act(() => {
    result.current.stopFirst.mutate("stop");
    result.current.stopSecond.mutate("stop");
  });
  await waitFor(() => expect(writes.size).toBe(2));

  writes.get("/api/robots/first/actions")!(queued(first));
  await waitFor(() => expect(result.current.stopFirst.isSuccess).toBe(true));
  expect(queuedIds()).toEqual(["first"]);
  expect(result.current.stopSecond.isPending).toBe(true);
  await waitFor(() => expect(reads).toHaveLength(2));

  writes.get("/api/robots/second/actions")!(queued(second));
  await waitFor(() => expect(result.current.stopSecond.isSuccess).toBe(true));
  expect(queuedIds()).toEqual(["first", "second"]);
  await waitFor(() => expect(reads).toHaveLength(3));
  expect(reads[0].signal.aborted).toBe(true);
  expect(reads[1].signal.aborted).toBe(true);

  // An answer to a read sent before the second write is ignored.
  reads[1].answer(Response.json(testRobotPage([first, second])));
  reads[2].answer(
    Response.json(
      testRobotPage([
        testRobot({ ...first, queuedControlTarget: "stop" }),
        testRobot({ ...second, queuedControlTarget: "stop" }),
      ]),
    ),
  );
  await waitFor(() => expect(result.current.list.isFetching).toBe(false));
  expect(queuedIds()).toEqual(["first", "second"]);
});

describe("the list between a delete and its refresh", () => {
  const listParams = {
    page: 0,
    pageSize: 10,
    filters: { view: "all" as const },
  };
  const listKey = robotKeys.list(listParams);
  const listed = testRobot({ id: "listed" });
  const cachedPage = testRobotPage([listed, testRobot({ id: "other" })], {
    total: 12,
    fleetTotal: 30,
    summary: { all: 20, "needs-attention": 5, offline: 3, "low-battery": 2 },
  });

  function renderList() {
    // Reads never answer, so the cache shows what the write alone left there.
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        init?.method === "DELETE"
          ? Promise.resolve(new Response(null, { status: 204 }))
          : new Promise<Response>(() => {}),
      ),
    );
    return renderHook(
      () => ({
        client: useQueryClient(),
        list: useQuery(robotListOptions(listParams)),
        deleteRobot: useDeleteRobot(),
        deleteAll: useDeleteAllRobots(),
      }),
      { queryData: [[listKey, cachedPage]] },
    );
  }

  test("deleting all robots leaves the page of an empty fleet", async () => {
    const { result } = renderList();

    await act(() => result.current.deleteAll.mutateAsync());

    expect(
      result.current.client.getQueryData<RobotPage>(listKey),
    ).toMatchObject({
      items: [],
      total: 0,
      fleetTotal: 0,
      summary: { all: 0, "needs-attention": 0, offline: 0, "low-battery": 0 },
      filterOptions: { sites: [], manufacturers: [] },
    });
  });
});
