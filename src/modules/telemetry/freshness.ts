export const onlineReportMaxAgeMs = 10_000;
export const delayedReportMaxAgeMs = 15_000;

export function connectionStatus(receivedAt: string | null, now: number) {
  if (!receivedAt) return "Unknown";
  const age = Math.max(0, now - Date.parse(receivedAt));
  return age <= onlineReportMaxAgeMs
    ? "Online"
    : age <= delayedReportMaxAgeMs
      ? "Delayed"
      : "Offline";
}

export function reportAge(receivedAt: string | null, now: number) {
  return receivedAt
    ? `Last report ${Math.max(0, Math.floor((now - Date.parse(receivedAt)) / 1000))}s ago`
    : "No reports yet";
}
