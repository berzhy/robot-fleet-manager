import { useQuery } from "@tanstack/react-query";

import type { RobotContext } from "@/common/robot";

import { isRobotNotFound } from "../api/robot-api";
import { robotContextOptions } from "../api/robot-queries";

/**
 * The robot as the server rendered it, then as polling reports it. The server's
 * context is the starting data rather than a one-off cache entry: Next keeps a
 * page you leave mounted but hidden, and the cache can drop the robot meanwhile,
 * so going Back refills it from here.
 */
export default function useLiveRobot(initialContext: RobotContext) {
  const query = useQuery({
    ...robotContextOptions(initialContext.robot.id),
    initialData: initialContext,
    // Its age, so an old render refreshes as soon as it is shown again.
    initialDataUpdatedAt: initialContext.evaluatedAt,
    // A deleted robot stays deleted: no more polls or refetches on focus.
    enabled: (contextQuery) => !isRobotNotFound(contextQuery.state.error),
  });

  // A failed refetch keeps the last data, so a deleted robot still shows its name.
  const missing = isRobotNotFound(query.error);
  return { ...query.data, missing, refreshFailed: query.isError && !missing };
}
