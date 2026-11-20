export const onlineReportMaxAgeMs = 10_000;
export const delayedReportMaxAgeMs = 15_000;

export type ConnectionStatus = "online" | "delayed" | "offline" | "unknown";

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
