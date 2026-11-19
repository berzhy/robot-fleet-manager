import type { Robot } from "@/modules/robots/robot";
export type RobotQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; robots: Robot[] };
