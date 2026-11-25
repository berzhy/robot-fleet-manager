import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import RobotDetails from "@/ui/features/robots/details/robot-details";
import { getDatabase } from "@/server/db/runtime-database";
import { getRobotSnapshot } from "@/server/robots/robots";

// Seeds the client query, which polls from here. The title shares this one
// read per request, so it agrees with the page.
const readInitialSnapshot = cache(async (robotId: string) => {
  await io();
  return getRobotSnapshot(getDatabase(), robotId);
});

export async function generateMetadata({
  params,
}: PageProps<"/robots/[robotId]">): Promise<Metadata> {
  const { robotId } = await params;
  const snapshot = await readInitialSnapshot(robotId);
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
  const snapshot = await readInitialSnapshot(robotId);
  if (!snapshot) {
    notFound();
  }

  return <RobotDetails initialSnapshot={snapshot} />;
}
