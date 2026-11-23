import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  openTestDatabase,
  removeTestDatabase,
} from "@/server/db/test-database";
import { createTestRobot, testRobotInput } from "@/server/robots/test-robots";

import type { FleetDatabase } from "../db/database";
import { latestTelemetry } from "../db/schema";
import { listRobots, robotRegistry } from "./robots";
import { robotHandlers } from "./robot-handlers";

let db: FleetDatabase;

beforeEach(() => {
  db = openTestDatabase();
});

afterEach(() => {
  removeTestDatabase(db);
  vi.restoreAllMocks();
});

test("filters before pagination, scopes summaries without the view, and retains full options", () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-15T12:00:00Z"));
  for (let index = 0; index < 22; index++) {
    const robot = createTestRobot(db);
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
  createTestRobot(db, {
    ...testRobotInput,
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
  ["idle", 20.1, 0, 0, 0],
  ["working", 20, 0, 1, 0],
  ["working", 20.1, 0, 0, 0],
  ["returning", 20, 0, 1, 0],
  ["returning", 20.1, 0, 0, 0],
  ["returning", null, 0, 0, 0],
  ["charging", 20, 0, 0, 0],
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
    const robot = createTestRobot(db);
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
  createTestRobot(db);

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
  const inspection = createTestRobot(db);
  createTestRobot(db, { ...testRobotInput, type: "cleaning" });
  createTestRobot(db, { ...testRobotInput, site: "Berlin" });
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
    createTestRobot(db, {
      ...testRobotInput,
      name: "Survey unit",
      integrationType: "ros2",
    }),
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
  createTestRobot(db, {
    ...testRobotInput,
    name: "Other",
    site: "Berlin",
    type: "delivery",
  });

  for (const search of [
    "SURVEY",
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

  for (const search of ["missing", robot.id, robot.id.slice(0, 8)]) {
    const result = listRobots(db, 0, 10, { view: "all", search });

    expect(result).toMatchObject({
      items: [],
      total: 0,
      summary: { all: 0 },
    });
  }
});

test("search treats SQL wildcards and escapes literally and validates trimmed testRobotInput", async () => {
  createTestRobot(db, { ...testRobotInput, name: "100%_unit\\dock" });
  createTestRobot(db, { ...testRobotInput, name: "100XXunitXdock" });

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

test.each([
  [10000, "Online"],
  [10001, "Delayed"],
  [15000, "Delayed"],
  [15001, "Offline"],
] as const)("connection search at report age %s matches %s", (age, status) => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  vi.spyOn(Date, "now").mockReturnValue(now);
  const robot = createTestRobot(db);
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
