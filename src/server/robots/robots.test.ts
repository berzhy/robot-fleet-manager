import { robotProblemCodes } from "@/modules/robots/robot-problems";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSchema } from "../db/create-schema";

import {
  robotTypes,
  integrationTypes,
  type Robot,
} from "@/modules/robots/robot";

import { openDatabase, type FleetDatabase } from "../db/database";
import { latestTelemetry, robots } from "../db/schema";
import {
  createRobots,
  createRobot,
  deleteRobot,
  getRobot,
  getRobotContext,
  listRobots,
  robotRegistry,
} from "./robots";
import { robotHandlers } from "./robot-handlers";

let directory: string;
let db: FleetDatabase;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "fleet-"));
  db = openDatabase(join(directory, "test.sqlite"));
  createSchema(db);
});

afterEach(() => {
  db.$client.close();
  rmSync(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const input = {
  name: "New robot",
  manufacturer: "Maker",
  type: "inspection" as const,
  integrationType: "vendor-api" as const,
  site: "Munich",
};

test("created metadata persists after reopening with unknown telemetry", () => {
  const robot = createRobot(db, { ...input, name: "  New robot  " });

  expect(robot).toMatchObject({
    ...input,
    activity: "unknown",
    area: null,
    batteryPercent: null,
    lastTelemetryAt: null,
    lastReceivedAt: null,
  });
  expect(Number.isNaN(Date.parse(robot.createdAt))).toBe(false);

  db.$client.close();
  db = openDatabase(join(directory, "test.sqlite"));

  expect(getRobot(db, robot.id)).toEqual(robot);
  const snapshot = getRobotContext(db, robot.id);
  expect(snapshot?.robot).toEqual(robot);
  expect(typeof snapshot?.verifiedAt).toBe("number");
  expect(getRobotContext(db, "missing")).toBeUndefined();

  expect(() => createRobot(db, { ...input, name: " " })).toThrow();
});

test("pagination orders newest first with descending id tie-breaking", () => {
  for (let i = 0; i < 21; i++) {
    db.insert(robots)
      .values({
        ...input,
        id: String(i).padStart(2, "0"),
        name:
          i < 2
            ? i === 0
              ? "alpha"
              : "Alpha"
            : `Robot ${String(i).padStart(2, "0")}`,
        createdAt: new Date(
          Date.UTC(2026, 0, Math.min(i, 19) + 1),
        ).toISOString(),
      })
      .run();
  }

  expect(listRobots(db, 0, 20).items.map((r) => r.id)).toEqual(
    Array.from({ length: 20 }, (_, i) => String(20 - i).padStart(2, "0")),
  );
  expect(listRobots(db, 1, 20)).toMatchObject({
    total: 21,
    page: 1,
    pageSize: 20,
    items: [{ id: "00" }],
  });
  expect(listRobots(db, 9)).toMatchObject({ items: [], total: 21, page: 9 });
});

test("deletion cascades only the selected robot's telemetry", () => {
  const first = createRobot(db, input);
  const second = createRobot(db, { ...input, name: "Other robot" });
  const observedAt = "2026-11-15T10:00:00.000Z";
  db.insert(latestTelemetry)
    .values([
      {
        robotId: first.id,
        activity: "working",
        batteryPercent: 42,
        area: "Lobby",
        observedAt,
      },
      {
        robotId: second.id,
        activity: "charging",
        batteryPercent: 60,
        area: "Base",
        observedAt,
      },
    ])
    .run();

  expect(getRobot(db, first.id)).toMatchObject({
    activity: "working",
    batteryPercent: 42,
    area: "Lobby",
    lastTelemetryAt: observedAt,
  });

  expect(deleteRobot(db, first.id)).toBe(true);
  expect(deleteRobot(db, first.id)).toBe(false);
  expect(getRobot(db, first.id)).toBeUndefined();
  expect(getRobot(db, second.id)).toMatchObject({
    name: "Other robot",
    activity: "charging",
  });
  expect(
    db
      .select()
      .from(latestTelemetry)
      .all()
      .map((row) => row.robotId),
  ).toEqual([second.id]);
});

test("HTTP contracts create/read/list/delete and reject invalid requests", async () => {
  const api = robotHandlers(() => db);
  const post = (value: unknown) =>
    api.create(
      new Request("http://local/api/robots", {
        method: "POST",
        body: JSON.stringify(value),
      }),
    );
  const missingType = {
    name: input.name,
    manufacturer: input.manufacturer,
    site: input.site,
    integrationType: input.integrationType,
  };

  expect((await post(missingType)).status).toBe(400);
  for (const type of ["unknown", "measurement", "", null]) {
    expect((await post({ ...input, type })).status).toBe(400);
  }
  expect((await post({ ...input, integrationType: undefined })).status).toBe(
    400,
  );
  expect(
    (await post({ ...input, integrationType: "unsupported" })).status,
  ).toBe(400);
  expect(listRobots(db, 0).total).toBe(0);

  expect((await post({ ...input, extra: true })).status).toBe(400);
  expect((await post({ ...input, name: " " })).status).toBe(400);
  expect((await post({ ...input, name: "x".repeat(101) })).status).toBe(400);
  expect(
    (
      await api.create(
        new Request("http://local/api/robots", { method: "POST", body: "{" }),
      )
    ).status,
  ).toBe(400);

  const response = await post(input);

  expect(response.status).toBe(201);
  const robot = (await response.json()) as Robot;
  expect(await api.get(robot.id).json()).toEqual(robot);
  expect(
    await api.list(new Request("http://local/api/robots")).json(),
  ).toMatchObject({ items: [robot], pageSize: 10 });
  expect(
    await api.list(new Request("http://local/api/robots?page=9")).json(),
  ).toMatchObject({ items: [], total: 1, page: 9, pageSize: 10 });

  for (const page of ["-1", "abc", "1.5", "Infinity"]) {
    expect(
      api.list(new Request(`http://local/api/robots?page=${page}`)).status,
    ).toBe(400);
  }

  expect(api.remove(robot.id).status).toBe(204);
  expect(api.remove(robot.id).status).toBe(404);
  expect(api.get(robot.id).status).toBe(404);
});

test("database failures return generic errors without leaking details", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  const api = robotHandlers(() => {
    throw new Error("private database path");
  });

  const response = api.list(new Request("http://local/api/robots"));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unable to complete robot request.",
    },
  });
  expect(logged).toHaveBeenCalledOnce();
});

test("HTTP page size controls database pagination and unsupported sizes are rejected", async () => {
  for (let i = 0; i < 21; i++) {
    db.insert(robots)
      .values({
        ...input,
        id: String(i).padStart(2, "0"),
        createdAt: "2026-11-14T12:00:00.000Z",
      })
      .run();
  }
  const api = robotHandlers(() => db);

  const result = (await api
    .list(new Request("http://local/api/robots?page=1&pageSize=10"))
    .json()) as { items: Robot[]; total: number; pageSize: number };

  expect(result.total).toBe(21);
  expect(result.pageSize).toBe(10);
  expect(result.items).toHaveLength(10);
  expect(result.items[0].id).toBe("10");

  for (const size of ["-1", "0", "11", "100", "101", "abc", "20.5"]) {
    expect(
      api.list(new Request(`http://local/api/robots?pageSize=${size}`)).status,
    ).toBe(400);
  }

  for (const size of [10, 20, 50]) {
    expect(
      await api
        .list(new Request(`http://local/api/robots?pageSize=${size}`))
        .json(),
    ).toMatchObject({ pageSize: size });
  }
});

test.each([10, 100])(
  "batch endpoint creates %i persisted robots in one request",
  async (count) => {
    const api = robotHandlers(() => db);

    const response = await api.createBatch(
      new Request("http://local/api/robots/batch", {
        method: "POST",
        body: JSON.stringify({
          robots: Array.from({ length: count }, (_, i) => ({
            ...input,
            name: `Batch ${i}`,
          })),
        }),
      }),
    );

    expect(response.status).toBe(201);
    const result = (await response.json()) as { items: Robot[] };
    expect(result.items).toHaveLength(count);
    expect(new Set(result.items.map((robot) => robot.id)).size).toBe(count);
    expect(listRobots(db, 0).total).toBe(count);
    expect(getRobot(db, result.items[0].id)).toEqual(result.items[0]);
  },
);

test("batch creation rolls back every insert if a later database write fails", () => {
  db.$client.exec(
    "CREATE TRIGGER fail_batch BEFORE INSERT ON robots WHEN NEW.name = 'Fail' BEGIN SELECT RAISE(ABORT, 'Test failure'); END;",
  );

  expect(() => createRobots(db, [input, { ...input, name: "Fail" }])).toThrow();
  expect(listRobots(db, 0).total).toBe(0);
});

test("invalid, empty and oversized batches write nothing", async () => {
  const api = robotHandlers(() => db);

  for (const robots of [
    [],
    Array.from({ length: 101 }, () => input),
    [input, { ...input, name: "" }],
    [input, { ...input, type: "unknown" }],
    [input, { ...input, integrationType: "unsupported" }],
    [input, { ...input, integrationType: undefined }],
    [input, { name: "No type", manufacturer: "Maker", site: "Munich" }],
  ]) {
    const response = await api.createBatch(
      new Request("http://local/api/robots/batch", {
        method: "POST",
        body: JSON.stringify({ robots }),
      }),
    );
    expect(response.status).toBe(400);
    expect(listRobots(db, 0).total).toBe(0);
  }
});

test.each(robotTypes)(
  "%s type persists in creation, list, details and registry",
  (type) => {
    const robot = createRobot(db, { ...input, type });

    expect(robot.type).toBe(type);
    expect(getRobot(db, robot.id)).toEqual(robot);
    expect(listRobots(db, 0).items).toEqual([robot]);
    expect(robotRegistry(db)).toEqual([robot]);
  },
);

test("fresh schema rejects missing and unsupported types even outside the API", () => {
  const insert = db.$client.prepare(
    "INSERT INTO robots (id, name, manufacturer, site, created_at, type, integration_type) VALUES (?, ?, ?, ?, ?, ?, 'vendor-api')",
  );

  for (const type of [null, "unknown", "measurement"]) {
    expect(() =>
      insert.run(
        "invalid",
        "Name",
        "Maker",
        "Site",
        "2026-01-01T00:00:00.000Z",
        type,
      ),
    ).toThrow();
  }
  expect(listRobots(db, 0).total).toBe(0);
});

test.each(integrationTypes)(
  "%s integration persists in list, details and registry",
  (integrationType) => {
    const robot = createRobot(db, { ...input, integrationType });

    expect(robot.integrationType).toBe(integrationType);
    expect(getRobot(db, robot.id)).toEqual(robot);
    expect(listRobots(db, 0).items).toEqual([robot]);
    expect(robotRegistry(db)).toEqual([robot]);
  },
);

test("fresh schema rejects missing and unsupported integrations outside the API", () => {
  const insert = db.$client.prepare(
    "INSERT INTO robots (id, name, manufacturer, site, created_at, type, integration_type) VALUES ('invalid', 'Name', 'Maker', 'Site', '2026-01-01T00:00:00Z', 'inspection', ?)",
  );

  for (const integrationType of [null, "unsupported"]) {
    expect(() => insert.run(integrationType)).toThrow();
  }
  expect(listRobots(db, 0).total).toBe(0);
});

test("actions validate current state, persist latest intent, and leave observations untouched", async () => {
  const { requestRobotAction } = await import("./robot-actions");
  const robot = createRobot(db, input);
  const action = (value: unknown, id = robot.id) =>
    requestRobotAction(
      db,
      id,
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify(value),
      }),
    );

  expect((await action({ action: "start" })).status).toBe(409);
  expect((await action({ action: "invalid" })).status).toBe(400);
  expect((await action({ action: "stop" }, "missing")).status).toBe(404);

  db.insert(latestTelemetry)
    .values({
      robotId: robot.id,
      activity: "working",
      batteryPercent: 50,
      area: "Lobby",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    })
    .run();

  expect((await action({ action: "start" })).status).toBe(409);

  expect((await action({ action: "stop" })).status).toBe(202);
  expect(getRobot(db, robot.id)).toMatchObject({
    activity: "working",
    controlTarget: "stop",
    controlRevision: 1,
    appliedControlRevision: 0,
  });

  expect((await action({ action: "return-to-base" })).status).toBe(202);
  expect(getRobot(db, robot.id)).toMatchObject({
    controlTarget: "base",
    controlRevision: 2,
  });

  db.$client
    .prepare("UPDATE latest_telemetry SET received_at = ? WHERE robot_id = ?")
    .run(new Date(Date.now() - 11000).toISOString(), robot.id);

  expect((await action({ action: "stop" })).status).toBe(409);
  expect(getRobot(db, robot.id)?.controlRevision).toBe(2);
});

test.each(robotProblemCodes)(
  "Retry for %s reissues work with a new revision",
  async (problemCode) => {
    const { requestRobotAction } = await import("./robot-actions");
    const robot = createRobot(db, input);
    db.insert(latestTelemetry)
      .values({
        robotId: robot.id,
        activity: "needs-attention",
        problemCode,
        batteryPercent: 50,
        area: "Lobby",
        observedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      })
      .run();

    const response = await requestRobotAction(
      db,
      robot.id,
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ action: "retry" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(getRobot(db, robot.id)).toMatchObject({
      controlTarget: "work",
      controlRevision: 1,
      activity: "needs-attention",
      problemCode,
    });
  },
);

test("action persistence failures roll back the target and return a generic error", async () => {
  const { requestRobotAction } = await import("./robot-actions");
  const robot = createRobot(db, input);
  db.insert(latestTelemetry)
    .values({
      robotId: robot.id,
      activity: "working",
      batteryPercent: 50,
      area: "Lobby",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    })
    .run();
  db.$client.exec(
    "CREATE TRIGGER fail_control BEFORE UPDATE ON robots BEGIN SELECT RAISE(ABORT, 'private failure'); END;",
  );
  vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await requestRobotAction(
    db,
    robot.id,
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ action: "stop" }),
    }),
  );

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unable to request robot action.",
    },
  });
  expect(getRobot(db, robot.id)).toMatchObject({
    controlTarget: "work",
    controlRevision: 0,
  });
});

test("filters before pagination, scopes summaries without the view, and retains full options", () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-15T12:00:00Z"));
  for (let index = 0; index < 22; index++) {
    const robot = createRobot(db, input);
    db.insert(latestTelemetry)
      .values({
        robotId: robot.id,
        activity: "idle",
        batteryPercent: 15,
        observedAt: "2026-11-15T11:00:00Z",
        receivedAt: "2026-11-15T11:00:00Z",
      })
      .run();
  }
  createRobot(db, {
    ...input,
    site: "Berlin",
    manufacturer: "Other",
    integrationType: "ros2",
  });
  const filters = {
    site: "Munich",
    manufacturer: "Maker",
    integrationType: "vendor-api",
    view: "low-battery",
  } as const;

  const result = listRobots(db, 1, 20, filters);

  expect(result.items).toHaveLength(2);
  expect(result).toMatchObject({
    total: 22,
    fleetTotal: 23,
    summary: { all: 22, "needs-attention": 22, offline: 22, "low-battery": 22 },
    filterOptions: {
      sites: ["Berlin", "Munich"],
      manufacturers: ["Maker", "Other"],
    },
  });

  expect(listRobots(db, 0, 20, { ...filters, view: "all" }).summary).toEqual(
    result.summary,
  );

  expect(listRobots(db, 0, 20, { ...filters, site: "Missing" })).toMatchObject({
    items: [],
    total: 0,
    fleetTotal: 23,
  });

  expect(robotRegistry(db)).toHaveLength(23);
});

test.each([
  ["idle", null, 0, 0, 0],
  ["idle", 0, 0, 1, 1],
  ["working", 20, 0, 0, 0],
  ["idle", 20.1, 0, 0, 0],
  ["working", 15, 0, 1, 0],
  ["working", 15.1, 0, 0, 0],
  ["returning", 15, 0, 1, 0],
  ["returning", 15.1, 0, 0, 0],
  ["returning", null, 0, 0, 0],
  ["charging", 15, 0, 0, 0],
  ["charging", 10, 0, 0, 0],
  ["returning", 10, 0, 1, 1],
  ["working", 10, 0, 1, 1],
  ["working", 10.1, 0, 1, 0],
  ["returning", 10.1, 0, 1, 0],
  ["charging", 0, 0, 0, 0],
  ["idle", 80, 10000, 0, 0],
  ["idle", 80, 15000, 0, 0],
  ["idle", 80, 15001, 0, 1],
  ["needs-attention", 80, 0, 0, 1],
  ["needs-attention", 10, 16000, 1, 1],
] as const)(
  "filter rules: %s battery=%s age=%s",
  (activity, batteryPercent, age, low, attention) => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    const robot = createRobot(db, input);
    db.insert(latestTelemetry)
      .values({
        robotId: robot.id,
        activity,
        batteryPercent,
        problemCode: activity === "needs-attention" ? "path-blocked" : null,
        observedAt: new Date(now - age).toISOString(),
        receivedAt: new Date(now - age).toISOString(),
      })
      .run();

    expect(listRobots(db, 0).summary).toEqual({
      all: 1,
      "low-battery": low,
      "needs-attention": attention,
      offline: age > 15000 ? 1 : 0,
    });
    expect(listRobots(db, 0, 10, { view: "low-battery" }).total).toBe(low);
    expect(listRobots(db, 0, 10, { view: "needs-attention" }).total).toBe(
      attention,
    );
  },
);

test("unknown reports do not qualify and invalid filter requests are rejected", () => {
  createRobot(db, input);

  expect(listRobots(db, 0).summary).toEqual({
    all: 1,
    offline: 0,
    "needs-attention": 0,
    "low-battery": 0,
  });

  const handlers = robotHandlers(() => db);
  for (const query of ["view=wrong", "integrationType=wrong", "site="]) {
    expect(
      handlers.list(new Request(`http://localhost/api/robots?${query}`)).status,
    ).toBe(400);
  }
});

test("type narrows rows and all tile counts with the other filters", () => {
  const inspection = createRobot(db, input);
  createRobot(db, { ...input, type: "cleaning" });
  createRobot(db, { ...input, site: "Berlin" });
  db.insert(latestTelemetry)
    .values({
      robotId: inspection.id,
      activity: "idle",
      batteryPercent: 10,
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    })
    .run();

  const result = listRobots(db, 0, 20, {
    view: "low-battery",
    type: "inspection",
    site: "Munich",
    manufacturer: "Maker",
    integrationType: "vendor-api",
  });

  expect(result.items.map((robot) => robot.id)).toEqual([inspection.id]);
  expect(result.summary).toEqual({
    all: 1,
    "needs-attention": 1,
    "low-battery": 1,
    offline: 0,
  });

  expect(
    robotHandlers(() => db).list(
      new Request("http://localhost/api/robots?type=invalid"),
    ).status,
  ).toBe(400);
});

test("search matches metadata and displayed labels before pagination and scopes tile counts", () => {
  const matching = Array.from({ length: 12 }, () =>
    createRobot(db, { ...input, name: "Survey unit", integrationType: "ros2" }),
  );
  const robot = matching[0];
  db.insert(latestTelemetry)
    .values({
      robotId: robot.id,
      activity: "needs-attention",
      problemCode: "path-blocked",
      batteryPercent: 80,
      area: "Loading bay",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    })
    .run();
  createRobot(db, {
    ...input,
    name: "Other",
    site: "Berlin",
    type: "delivery",
  });

  for (const search of [
    "SURVEY",
    robot.id,
    robot.id.slice(0, 8),
    "Maker",
    "Munich",
    "Inspection robot",
    "ROS 2",
    "ros2",
    "Loading bay",
    "Needs attention",
    "Path blocked",
    "Online",
    "80%",
  ]) {
    const result = listRobots(db, 0, 10, {
      view: "needs-attention",
      site: "Munich",
      search,
    });
    expect(result.items.map((item) => item.id)).toEqual([robot.id]);
    expect(result.summary.all).toBe(
      [
        robot.id,
        robot.id.slice(0, 8),
        "Loading bay",
        "Needs attention",
        "Path blocked",
        "Online",
        "80%",
      ].includes(search)
        ? 1
        : 12,
    );
    expect(result.summary["needs-attention"]).toBe(1);
    expect(result.fleetTotal).toBe(13);
    expect(result.filterOptions.sites).toEqual(["Berlin", "Munich"]);
  }

  expect(
    listRobots(db, 1, 10, { view: "all", search: "survey" }),
  ).toMatchObject({ total: 12, items: [expect.anything(), expect.anything()] });

  expect(listRobots(db, 0, 10, { view: "all", search: "missing" }).total).toBe(
    0,
  );
});

test("search treats SQL wildcards and escapes literally and validates trimmed input", async () => {
  createRobot(db, { ...input, name: "100%_unit\\dock" });
  createRobot(db, { ...input, name: "100XXunitXdock" });

  for (const search of ["%_", "unit\\dock"]) {
    expect(listRobots(db, 0, 20, { view: "all", search }).total).toBe(1);
  }

  const handlers = robotHandlers(() => db);
  for (const search of ["a", " ", "a".repeat(101)]) {
    expect(
      handlers.list(
        new Request(
          `http://localhost/api/robots?search=${encodeURIComponent(search)}`,
        ),
      ).status,
    ).toBe(400);
  }

  const response = handlers.list(
    new Request("http://localhost/api/robots?search=%20%20100%25%20%20"),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ total: 1 });
});

test("detail context includes only same-site peers and returns 404 for a missing robot", async () => {
  const selected = createRobot(db, input);
  const peer = createRobot(db, { ...input, name: "Peer" });
  createRobot(db, { ...input, site: "Berlin" });

  const context = getRobotContext(db, selected.id)!;

  expect(context.robot.id).toBe(selected.id);
  expect(context.siteRobots).toEqual([
    { id: peer.id, name: "Peer", area: null, lastReceivedAt: null },
  ]);

  const response = robotHandlers(() => db).context(selected.id);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    robot: { id: selected.id },
    siteRobots: [{ id: peer.id }],
  });

  expect(robotHandlers(() => db).context("missing").status).toBe(404);
});

test("bulk deletion removes the entire fleet and cascades telemetry, including on repeated calls", () => {
  const records = createRobots(db, [input, { ...input, site: "Berlin" }]);
  db.insert(latestTelemetry)
    .values(
      records.map((robot) => ({
        robotId: robot.id,
        activity: "idle" as const,
        observedAt: new Date().toISOString(),
      })),
    )
    .run();
  const handlers = robotHandlers(() => db);

  expect(handlers.removeAll().status).toBe(204);
  expect(listRobots(db, 0)).toMatchObject({
    items: [],
    total: 0,
    fleetTotal: 0,
  });
  expect(db.select().from(latestTelemetry).all()).toEqual([]);

  expect(handlers.removeAll().status).toBe(204);
});

test("failed bulk deletion returns an error and rolls back every deletion", async () => {
  createRobots(db, [input, input]);
  db.$client.exec(
    "CREATE TRIGGER reject_deletion AFTER DELETE ON robots BEGIN SELECT RAISE(ABORT, 'Deletion failed'); END",
  );
  const log = vi.spyOn(console, "error").mockImplementation(() => {});

  const result = robotHandlers(() => db).removeAll();

  expect(result.status).toBe(500);
  expect(await result.json()).toMatchObject({
    error: { code: "INTERNAL_ERROR" },
  });
  expect(listRobots(db, 0).total).toBe(2);
  expect(log).toHaveBeenCalledOnce();
});

test.each([10, 10.1, null])(
  "Start activity requires a known battery above 10%% (%s)",
  async (batteryPercent) => {
    const { requestRobotAction } = await import("./robot-actions");
    const robot = createRobot(db, input);
    db.insert(latestTelemetry)
      .values({
        robotId: robot.id,
        activity: "idle",
        batteryPercent,
        area: "Base",
        observedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      })
      .run();

    const response = await requestRobotAction(
      db,
      robot.id,
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      }),
    );

    const allowed = batteryPercent !== null && batteryPercent > 10;
    expect(response.status).toBe(allowed ? 202 : 409);
    expect(getRobot(db, robot.id)?.controlRevision).toBe(allowed ? 1 : 0);
  },
);

test.each([
  [10000, "Online"],
  [10001, "Delayed"],
  [15000, "Delayed"],
  [15001, "Offline"],
] as const)("connection search at report age %s matches %s", (age, status) => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  vi.spyOn(Date, "now").mockReturnValue(now);
  const robot = createRobot(db, input);
  db.insert(latestTelemetry)
    .values({
      robotId: robot.id,
      activity: "idle",
      batteryPercent: 80,
      observedAt: new Date(now - age).toISOString(),
      receivedAt: new Date(now - age).toISOString(),
    })
    .run();

  for (const search of ["Online", "Delayed", "Offline"]) {
    expect(listRobots(db, 0, 10, { view: "all", search }).total).toBe(
      search === status ? 1 : 0,
    );
  }
});
