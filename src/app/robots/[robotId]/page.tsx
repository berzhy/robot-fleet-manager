import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import RobotDetails from "@/features/robots/details/robot-details";
import { getDatabase } from "@/server/db/runtime-database";
import { getRobotContext } from "@/server/robots/robots";

// The title and the page read the robot once per request, so they agree.
const readRobotContext = cache(async (robotId: string) => {
  await io();
  return getRobotContext(getDatabase(), robotId);
});

export async function generateMetadata({
  params,
}: PageProps<"/robots/[robotId]">): Promise<Metadata> {
  const { robotId } = await params;
  const snapshot = await readRobotContext(robotId);
  return { title: snapshot?.robot.name ?? "Robot not found" };
}

export default function RobotPage({ params }: PageProps<"/robots/[robotId]">) {
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
  const snapshot = await readRobotContext(robotId);
  if (!snapshot) {
    notFound();
  }

  return <RobotDetails initialContext={snapshot} />;
}
