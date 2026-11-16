import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FleetDatabase } from "./database";

const schemaSql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "schema.sql"),
  "utf8",
);

export function createSchema(db: FleetDatabase) {
  db.$client.exec(schemaSql);
}
