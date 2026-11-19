"use client";

import { useQuery } from "@tanstack/react-query";

import type { RobotContext } from "@/modules/robots/robot";

import { robotContextOptions } from "../api/robot-queries";

export default function useLiveRobot(initial: RobotContext) {
  const query = useQuery({
    ...robotContextOptions(initial.robot.id),
    initialData: initial,
    // A deleted robot is cached as null; stop polling for it.
    enabled: (contextQuery) => contextQuery.state.data !== null,
  });

  return {
    ...(query.data ?? initial),
    missing: query.data === null,
    refreshFailed: query.isError,
  };
}
