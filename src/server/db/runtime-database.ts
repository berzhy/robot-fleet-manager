import "server-only";

import { databasePath, openDatabase } from "./database";
import type { FleetDatabase } from "./database";
const runtime = globalThis as typeof globalThis & {
  fleetDatabases?: Map<string, FleetDatabase>;
};
export function getDatabase() {
  const path = databasePath();
  const connections = (runtime.fleetDatabases ??= new Map<
    string,
    FleetDatabase
  >());
  let db = connections.get(path);
  if (!db) {
    db = openDatabase(path);
    connections.set(path, db);
  }
  return db;
}
