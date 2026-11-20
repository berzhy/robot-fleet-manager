import { io } from "next/cache";

import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";

const handlers = robotHandlers(getDatabase);

export async function GET(request: Request) {
  await io();
  return handlers.list(request);
}

export async function POST(request: Request) {
  await io();
  return handlers.create(request);
}

export async function DELETE() {
  await io();
  return handlers.removeAll();
}
