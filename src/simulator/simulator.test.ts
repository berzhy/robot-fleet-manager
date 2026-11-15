import { afterEach, expect, test, vi } from "vitest";
import { runSimulator } from "./simulator";
import type { Robot } from "@/modules/robots/robot";
const robot: Robot = {
  id: "one",
  name: "Test",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Site",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastTelemetryAt: null,
  lastReceivedAt: null,
  area: null,
  batteryPercent: null,
  activity: "unknown",
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
test("registry discovery reconciles additions/deletions and reports chunks of at most 100", async () => {
  const controller = new AbortController();
  const batches: string[][] = [];
  let discovery = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL, init?: RequestInit) => {
      if (url.pathname.endsWith("registry")) {
        discovery++;
        return Promise.resolve(
          Response.json({
            items:
              discovery === 1
                ? Array.from({ length: 101 }, (_, i) => ({
                    ...robot,
                    id: String(i),
                  }))
                : [{ ...robot, id: "new" }],
          }),
        );
      }
      const body = JSON.parse(init!.body as string) as {
        reports: { robotId: string }[];
      };
      batches.push(body.reports.map((report) => report.robotId));
      return Promise.resolve(new Response(null, { status: 204 }));
    }),
  );
  const running = runSimulator("http://local", controller.signal);
  await vi.waitFor(() => expect(batches).toHaveLength(2));
  expect(batches.map((batch) => batch.length)).toEqual([100, 1]);
  await vi.waitFor(() => expect(batches[2]).toEqual(["new"]), {
    timeout: 3000,
  });
  controller.abort();
  await running;

  expect(batches).toHaveLength(3);
});
test("failed discovery retains known robots and failed delivery retries without overlapping", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  const controller = new AbortController();
  let discoveries = 0;
  let deliveries = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL) => {
      if (url.pathname.endsWith("registry")) {
        if (++discoveries === 2) throw new Error("network");
        return Promise.resolve(Response.json({ items: [robot] }));
      }
      deliveries++;
      return Promise.resolve(
        new Response(null, { status: deliveries === 1 ? 500 : 204 }),
      );
    }),
  );
  const running = runSimulator("http://local", controller.signal);
  await vi.waitFor(() => expect(deliveries).toBe(3), { timeout: 4000 });
  controller.abort();
  await running;
});
