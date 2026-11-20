import { io } from "next/cache";

import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";

const handlers = robotHandlers(getDatabase);

export async function GET(
  _request: Request,
  context: RouteContext<"/api/robots/[robotId]">,
) {
  await io();
  return handlers.get((await context.params).robotId);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/robots/[robotId]">,
) {
  await io();
  return handlers.remove((await context.params).robotId);
}
