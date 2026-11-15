import { afterEach, expect, test, vi } from "vitest";
import {
  createRobot,
  getRobots,
  deleteRobot as dataDeleteRobot,
} from "./robot-api";
afterEach(() => vi.unstubAllGlobals());
test("requests a server page with cancellation and rejects HTTP failures", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ items: [], total: 0, page: 2, pageSize: 20 }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  expect(await getRobots(2, 20, controller.signal)).toEqual({
    items: [],
    total: 0,
    page: 2,
    pageSize: 20,
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
