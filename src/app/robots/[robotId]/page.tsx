import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Typography from "@mui/material/Typography";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { robotKeys } from "@/features/robots/api/robot-queries";
import RobotDetails from "@/features/robots/details/robot-details";
import { createQueryClient } from "@/query/query-client";
import { getDatabase } from "@/server/db/runtime-database";
import { getRobotContext } from "@/server/robots/robots";

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
  const snapshot = getRobotContext(getDatabase(), robotId);
  if (!snapshot) {
    notFound();
  }

  const client = createQueryClient();
  client.setQueryData(robotKeys.context(robotId), snapshot);

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <RobotDetails {...snapshot} />
    </HydrationBoundary>
  );
}
