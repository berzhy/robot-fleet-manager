import { createSchema } from "../src/server/db/create-schema";
import { databasePath, openDatabase } from "../src/server/db/database";

const db = openDatabase(databasePath());
try {
  createSchema(db);
  console.log("Database schema created.");
} finally {
  db.$client.close();
}
