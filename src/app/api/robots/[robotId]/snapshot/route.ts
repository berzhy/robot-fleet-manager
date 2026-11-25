import { io } from "next/cache";

import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";

const handlers = robotHandlers(getDatabase);

export async function GET(
  _request: Request,
  context: RouteContext<"/api/robots/[robotId]/snapshot">,
) {
  await io();
  return handlers.snapshot((await context.params).robotId);
}
