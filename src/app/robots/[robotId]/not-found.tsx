"use client";

import NotFoundContent from "@/ui/status-pages/not-found-content";
import { robotListHref } from "@/ui/features/robots/robot-list-return";

export default function RobotNotFound() {
  return (
    <NotFoundContent title="Robot not found" robotsHref={robotListHref()} />
  );
}
