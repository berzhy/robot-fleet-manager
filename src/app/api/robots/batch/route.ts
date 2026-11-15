import { io } from "next/cache";

import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";

const handlers = robotHandlers(getDatabase);
export async function POST(request: Request) {
  await io();
  return handlers.createBatch(request);
}
