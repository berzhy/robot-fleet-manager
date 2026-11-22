import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createSchema } from "@/server/db/create-schema";
import { openDatabase, type FleetDatabase } from "@/server/db/database";

/** A database file of its own with the schema, so a test can close and reopen it. */
export function openTestDatabase(): FleetDatabase {
  const directory = mkdtempSync(join(tmpdir(), "fleet-"));
  const db = openDatabase(join(directory, "test.sqlite"));
  createSchema(db);
  return db;
}

export function removeTestDatabase(db: FleetDatabase) {
  const file = db.$client.name;
  db.$client.close();
  rmSync(dirname(file), { recursive: true, force: true });
}
