import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function databasePath() {
  // The database belongs to runtime disk, not the deployment bundle.
  return resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ??
      "data/fleet.sqlite",
  );
}

export function openDatabase(path: string) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const client = new Database(path, { timeout: 5000 });

  try {
    client.pragma("journal_mode = WAL");
    client.pragma("foreign_keys = ON");
    return drizzle(client);
  } catch (error) {
    client.close();
    throw error;
  }
}

export type FleetDatabase = ReturnType<typeof openDatabase>;
