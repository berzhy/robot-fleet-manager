import "server-only";

import { databasePath, openDatabase } from "./database";
import type { FleetDatabase } from "./database";

// On globalThis, so a dev reload of this module reuses the open connection.
const runtime = globalThis as typeof globalThis & {
  fleetDatabase?: FleetDatabase;
};

export function getDatabase() {
  return (runtime.fleetDatabase ??= openDatabase(databasePath()));
}
