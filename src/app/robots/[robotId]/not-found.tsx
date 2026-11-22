"use client";

import NotFoundContent from "@/shared/not-found/not-found-content";
import { robotListHref } from "@/features/robots/list/use-robot-list-view";

export default function RobotNotFound() {
  return (
    <NotFoundContent title="Robot not found" robotsHref={robotListHref()} />
  );
}
