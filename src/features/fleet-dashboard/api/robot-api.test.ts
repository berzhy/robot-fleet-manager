import { pageMetadata } from "../test-fixtures";
import { afterEach, expect, test, vi } from "vitest";
import {
  createRobot,
  getRobots,
  getRobotContext,
  deleteRobot as dataDeleteRobot,
} from "./robot-api";
afterEach(() => vi.unstubAllGlobals());
test("requests a server page with cancellation and rejects HTTP failures", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        items: [],
        total: 0,
        page: 2,
        pageSize: 20,
        ...pageMetadata(),
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  expect(await getRobots(2, 20, controller.signal)).toEqual({
    items: [],
    total: 0,
    page: 2,
    pageSize: 20,
    ...pageMetadata(),
    evaluatedAt: expect.any(Number) as number,
  });
  expect(fetcher).toHaveBeenCalledWith("/api/robots?page=2&pageSize=20", {
    signal: controller.signal,
    cache: "no-store",
  });
  await expect(getRobots(0)).rejects.toThrow("Unable to load robots.");
});

test("deletes an encoded robot id, accepts an empty 204 and rejects failures", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(null, { status: 404 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(dataDeleteRobot("robot/id")).resolves.toBeUndefined();
  expect(fetcher).toHaveBeenCalledWith("/api/robots/robot%2Fid", {
    method: "DELETE",
  });
  await expect(dataDeleteRobot("missing")).rejects.toThrow(
    "Unable to delete robot.",
  );
});

test("creates metadata using POST and requires a 201 response", async () => {
  const input = {
    name: "Robot ABCD1234",
    manufacturer: "Maker",
    type: "inspection" as const,
    integrationType: "vendor-api" as const,
    site: "Munich",
  };
  const created = {
    ...input,
    id: "new",
    createdAt: "2026-11-14T12:00:00.000Z",
    activity: "unknown",
    area: null,
    batteryPercent: null,
    lastTelemetryAt: null,
    lastReceivedAt: null,
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  expect(await createRobot(input)).toEqual(created);
  expect(fetcher).toHaveBeenCalledWith("/api/robots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await expect(createRobot(input)).rejects.toThrow("Unable to add robot.");
});

test("detail requests encode IDs, support cancellation, and distinguish deletion from failure", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  expect(await getRobotContext("robot/id", controller.signal)).toBeNull();
  expect(fetcher).toHaveBeenCalledWith("/api/robots/robot%2Fid/context", {
    cache: "no-store",
    signal: controller.signal,
  });
  await expect(getRobotContext("failure")).rejects.toThrow(
    "Unable to refresh robot context.",
  );
});

test("encodes literal search text and combined filters in the list request", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      items: [],
      total: 0,
      page: 0,
      pageSize: 20,
      ...pageMetadata(),
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  await getRobots(0, 20, undefined, {
    view: "offline",
    search: "Robot %_&",
    site: "Munich & Berlin",
    manufacturer: "A/B",
    integrationType: "ros2",
    type: "inspection",
  });
  const url = new URL(fetcher.mock.calls[0][0] as string, "http://localhost");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: "0",
    pageSize: "20",
    view: "offline",
    search: "Robot %_&",
    site: "Munich & Berlin",
    manufacturer: "A/B",
    integrationType: "ros2",
    type: "inspection",
  });
});
