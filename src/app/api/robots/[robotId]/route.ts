import { io } from "next/cache";
import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";
const handlers = robotHandlers(getDatabase);
type Context = { params: Promise<{ robotId: string }> };
export async function GET(_request: Request, context: Context) {
  await io();
  return handlers.get((await context.params).robotId);
}

export async function DELETE(_request: Request, context: Context) {
  await io();
  return handlers.remove((await context.params).robotId);
}
