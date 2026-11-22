import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";

const handlers = robotHandlers(getDatabase);

export async function POST(
  request: Request,
  context: RouteContext<"/api/robots/[robotId]/actions">,
) {
  return handlers.requestAction((await context.params).robotId, request);
}
