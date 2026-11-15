import type { RobotPage } from "@/modules/robots/robot";
export function pageMetadata(
  total = 0,
): Pick<RobotPage, "summary" | "fleetTotal" | "filterOptions" | "evaluatedAt"> {
  return {
    summary: { all: total, "needs-attention": 0, offline: 0, "low-battery": 0 },
    fleetTotal: total,
    filterOptions: { sites: ["Munich"], manufacturers: ["Maker"] },
    evaluatedAt: Date.now(),
  };
}
