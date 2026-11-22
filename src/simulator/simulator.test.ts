import { initializeRobot } from "./simulation";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { runSimulator } from "./simulator";
import type { RegistryRobot } from "@/common/robots/robot";

const robot: RegistryRobot = {
  problemCode: null,
  controlTarget: "work",
  controlRevision: 0,
  appliedControlRevision: 0,
  id: "one",
  name: "Test",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Site",
  createdAt: "2026-01-01T00:00:00.000Z",
  queuedControlTarget: null,
  lastReceivedAt: null,
  area: null,
  batteryPercent: null,
  activity: "unknown",
};

let controller: AbortController;
let running: Promise<void> | undefined;

beforeEach(() => {
  controller = new AbortController();
  running = undefined;
});

afterEach(async () => {
  controller.abort();
  try {
    await running;
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

test("registry discovery reconciles additions/deletions and reports chunks of at most 100", async () => {
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

  running = runSimulator("http://local", controller.signal);
  await vi.waitFor(() => expect(batches).toHaveLength(2));
  expect(batches.map((batch) => batch.length)).toEqual([100, 1]);

  await vi.waitFor(() => expect(batches[2]).toEqual(["new"]), {
    timeout: 3000,
  });
  controller.abort();
  await running;

  expect(batches).toHaveLength(3);
});

test("failed discovery retains known robots and failed telemetry is retried", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  let discoveries = 0;
  const deliveries: string[][] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL, init?: RequestInit) => {
      if (url.pathname.endsWith("registry")) {
        if (++discoveries === 2) {
          throw new Error("network");
        }
        return Promise.resolve(Response.json({ items: [robot] }));
      }
      const { reports } = JSON.parse(init!.body as string) as {
        reports: { robotId: string }[];
      };
      deliveries.push(reports.map((report) => report.robotId));
      return Promise.resolve(
        new Response(null, { status: deliveries.length === 1 ? 500 : 204 }),
      );
    }),
  );

  running = runSimulator("http://local", controller.signal);
  await vi.waitFor(() => expect(deliveries).toHaveLength(3), { timeout: 4000 });
  controller.abort();
  await running;

  expect(deliveries).toEqual([[robot.id], [robot.id], [robot.id]]);
});

test("existing robots receive controls and failed telemetry does not replay older registry intent", async () => {
  let discoveries = 0;
  const reports: { activity: string; appliedControlRevision: number }[] = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL, init?: RequestInit) => {
      if (url.pathname.endsWith("registry")) {
        discoveries++;
        return Promise.resolve(
          Response.json({
            items: [
              {
                ...robot,
                ...(discoveries === 2
                  ? { controlTarget: "stop", controlRevision: 1 }
                  : {}),
              },
            ],
          }),
        );
      }
      const body = JSON.parse(init!.body as string) as {
        reports: typeof reports;
      };
      reports.push(body.reports[0]);
      if (reports.length === 3) {
        controller.abort();
      }
      return Promise.resolve(
        new Response(null, { status: reports.length === 2 ? 500 : 204 }),
      );
    }),
  );

  running = runSimulator("http://local", controller.signal);
  await running;

  expect(reports).toHaveLength(3);
  expect(reports.slice(1)).toEqual([
    expect.objectContaining({ activity: "idle", appliedControlRevision: 1 }),
    expect.objectContaining({ activity: "idle", appliedControlRevision: 1 }),
  ]);
});

test("outages omit telemetry but preserve discovery and local activity until reporting recovers", async () => {
  const candidate = Array.from({ length: 20 }, (_, i) => ({
    ...robot,
    id: `connection-${i}`,
  })).find((record) => initializeRobot(record).connectionHash % 5 === 0)!;
  const state = initializeRobot(candidate);
  const start =
    ((180 - (Math.floor(state.connectionHash / 5) % 180)) % 180) * 1000;
  const clock = vi.spyOn(Date, "now").mockReturnValue(start);
  let discoveries = 0;
  const delivered: { activity: string; observedAt: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL, init?: RequestInit) => {
      if (url.pathname.endsWith("registry")) {
        clock.mockReturnValue(start + discoveries++ * 30000);
        return Promise.resolve(Response.json({ items: [candidate] }));
      }
      const body = JSON.parse(init!.body as string) as {
        reports: typeof delivered;
      };
      delivered.push(...body.reports);
      if (discoveries === 3) {
        controller.abort();
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    }),
  );

  running = runSimulator("http://local", controller.signal);
  await running;

  expect(discoveries).toBe(3);
  expect(delivered).toEqual([
    expect.objectContaining({
      activity: "idle",
      observedAt: new Date(start).toISOString(),
    }),
    expect.objectContaining({
      activity: "working",
      observedAt: new Date(start + 60000).toISOString(),
    }),
  ]);
});
