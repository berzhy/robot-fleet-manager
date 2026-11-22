// The values the server, the browser and the simulator agree on. Types,
// schemas and database columns are derived from these lists.

export const robotTypes = [
  "cleaning",
  "security",
  "delivery",
  "inspection",
] as const;

export const integrationTypes = ["ros2", "vda5050", "vendor-api"] as const;

export const robotActivities = [
  "working",
  "idle",
  "returning",
  "charging",
  "needs-attention",
] as const;

export const robotProblemCodes = [
  "path-blocked",
  "position-lost",
  "sensor-obstructed",
] as const;

export const robotActions = [
  "start",
  "stop",
  "retry",
  "return-to-base",
] as const;

/** What the robot's latest command asks of it. */
export const controlTargets = ["work", "stop", "base"] as const;

export const fleetViews = [
  "all",
  "needs-attention",
  "offline",
  "low-battery",
] as const;

export const robotPageSize = 10;
export const robotPageSizes = [10, 20, 50] as const;

// The views' definitions, which the filter help text quotes. A battery counts
// from the threshold down; a report is offline once older than offlineAfterMs.
export const lowBatteryPercent = 20;
export const criticalBatteryPercent = 10;
export const offlineAfterMs = 15_000;

export const maxReportsPerBatch = 100;
