import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { io } from "next/cache";
import { getRobot } from "@/server/robots/robots";
import { getDatabase } from "@/server/db/runtime-database";
import RobotDetails from "@/features/fleet-dashboard/robot-details/robot-details";

export default function RobotPage({
  params,
}: {
  params: Promise<{ robotId: string }>;
}) {
  return (
    <Suspense
      fallback={<Typography role="status">Loading robot details</Typography>}
    >
      <RobotContent params={params} />
    </Suspense>
  );
}

async function RobotContent({
  params,
}: {
  params: Promise<{ robotId: string }>;
}) {
  const { robotId } = await params;
  await io();
  const robot = getRobot(getDatabase(), robotId);
  if (!robot) notFound();
  return <RobotDetails robot={robot} />;
}
