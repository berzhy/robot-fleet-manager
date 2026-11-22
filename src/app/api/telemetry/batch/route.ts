import { getDatabase } from "@/server/db/runtime-database";
import { telemetryHandlers } from "@/server/telemetry/telemetry-handlers";

const handlers = telemetryHandlers(getDatabase);

export async function POST(request: Request) {
  return handlers.ingest(request);
}
