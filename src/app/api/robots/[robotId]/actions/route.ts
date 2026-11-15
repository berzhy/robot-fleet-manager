import { io } from "next/cache";
import { getDatabase } from "@/server/db/runtime-database";
import { requestRobotAction } from "@/server/robots/robot-actions";
export async function POST(
  request: Request,
  context: { params: Promise<{ robotId: string }> },
) {
  await io();
  return requestRobotAction(
    getDatabase(),
    (await context.params).robotId,
    request,
  );
}
