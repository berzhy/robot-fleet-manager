import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { databasePath, openDatabase } from "../src/server/db/database";
const db = openDatabase(databasePath());
try {
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrated.");
} finally {
  db.$client.close();
}
