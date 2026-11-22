export const onlineReportMaxAgeMs = 10_000;
export const delayedReportMaxAgeMs = 15_000;

export type ConnectionStatus = "online" | "delayed" | "offline" | "unknown";

/** A report exists but is too old to describe the robot now. */
export function isStale(status: ConnectionStatus) {
  return status === "delayed" || status === "offline";
}

export function connectionStatus(
  receivedAt: string | null,
  now: number,
): ConnectionStatus {
  if (!receivedAt) {
    return "unknown";
  }
  const age = Math.max(0, now - Date.parse(receivedAt));
  return age <= onlineReportMaxAgeMs
    ? "online"
    : age <= delayedReportMaxAgeMs
      ? "delayed"
      : "offline";
}
