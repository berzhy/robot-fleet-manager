import { io } from "next/cache";
import { getDatabase } from "@/server/db/runtime-database";
import { telemetryHandlers } from "@/server/telemetry/telemetry-handlers";
const handlers = telemetryHandlers(getDatabase);
export async function POST(request: Request) {
  await io();
  return handlers.ingest(request);
}
