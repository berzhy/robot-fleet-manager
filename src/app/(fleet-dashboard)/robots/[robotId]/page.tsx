import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getRobot } from "@/features/fleet-dashboard/api/robot-query";
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
  const robot = getRobot(robotId);
  if (!robot) notFound();
  return <RobotDetails robot={robot} />;
}
