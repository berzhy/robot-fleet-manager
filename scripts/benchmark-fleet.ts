// Times the list and details queries against a fleet of generated robots, in
// a temporary database of its own. Run: npm run benchmark [robotCount]
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { generateRobotInput } from "../src/features/robots/list/generate-robot-input";
import { robotActivities, robotPageSize } from "../src/common/robots/robot";
import { createSchema } from "../src/server/db/create-schema";
import { openDatabase } from "../src/server/db/database";
import { latestTelemetry } from "../src/server/db/schema";
import {
  createRobots,
  getRobotContext,
  listRobots,
} from "../src/server/robots/robots";

const defaultRobotCount = 100_000;
// SQLite caps the parameters in one statement; this many rows stay under it.
const insertBatchSize = 1_000;
const runsPerQuery = 15;
const areas = ["Base", "Lobby", "Floor 1", "Warehouse"];
// Spread report times over a minute, so the fleet has online, delayed and
// offline robots.
const reportSpreadMs = 60_000;
// "unknown" is what a robot without a report shows; these robots all report.
const reportedActivities = robotActivities.filter(
  (activity) => activity !== "unknown",
);

const robotCount = Number(process.argv[2] ?? defaultRobotCount);
const directory = mkdtempSync(join(tmpdir(), "fleet-benchmark-"));
const db = openDatabase(join(directory, "fleet.sqlite"));

try {
  createSchema(db);
  const seededAt = Date.now();
  for (let start = 0; start < robotCount; start += insertBatchSize) {
    const length = Math.min(insertBatchSize, robotCount - start);
    const robots = createRobots(
      db,
      Array.from({ length }, () => generateRobotInput()),
    );
    db.insert(latestTelemetry)
      .values(
        robots.map((robot, index) => {
          const activity =
            reportedActivities[(start + index) % reportedActivities.length];
          return {
            robotId: robot.id,
            activity,
            problemCode:
              activity === "needs-attention" ? ("path-blocked" as const) : null,
            batteryPercent: (start + index) % 101,
            area: areas[(start + index) % areas.length],
            receivedAt: new Date(
              seededAt - ((start + index) % reportSpreadMs),
            ).toISOString(),
            observedAt: new Date(seededAt).toISOString(),
          };
        }),
      )
      .run();
  }
  db.$client.exec("ANALYZE");

  const [someRobot] = listRobots(db, 0, 1).items;
  const lastPage = Math.ceil(robotCount / robotPageSize) - 1;
  const queries: [string, () => unknown][] = [
    ["list, first page", () => listRobots(db, 0)],
    ["list, last page", () => listRobots(db, lastPage)],
    [
      "list, Offline view",
      () => listRobots(db, 0, robotPageSize, { view: "offline" }),
    ],
    [
      "list, one site and type",
      () =>
        listRobots(db, 0, robotPageSize, {
          view: "all",
          site: "Berlin",
          type: "cleaning",
        }),
    ],
    [
      "list, search",
      () =>
        listRobots(db, 0, robotPageSize, { view: "all", search: "robot 4f" }),
    ],
    ["robot details", () => getRobotContext(db, someRobot.id)],
  ];

  console.log(`${robotCount} robots, median of ${runsPerQuery} runs:`);
  for (const [name, run] of queries) {
    const durations = Array.from({ length: runsPerQuery }, () => {
      const startedAt = performance.now();
      const result = run();
      const elapsedMs = performance.now() - startedAt;
      return { elapsedMs, bytes: JSON.stringify(result).length };
    }).sort((a, b) => a.elapsedMs - b.elapsedMs);
    const median = durations[Math.floor(runsPerQuery / 2)];
    console.log(
      `  ${name.padEnd(26)} ${median.elapsedMs.toFixed(1).padStart(7)} ms ${(median.bytes / 1024).toFixed(1).padStart(8)} KB`,
    );
  }
} finally {
  db.$client.close();
  rmSync(directory, { recursive: true, force: true });
}
