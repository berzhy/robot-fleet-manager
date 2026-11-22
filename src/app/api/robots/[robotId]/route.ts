import { getDatabase } from "@/server/db/runtime-database";
import { robotHandlers } from "@/server/robots/robot-handlers";

const handlers = robotHandlers(getDatabase);

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/robots/[robotId]">,
) {
  return handlers.remove((await context.params).robotId);
}
