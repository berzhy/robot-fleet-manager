export function connectionStatus(receivedAt: string | null, now: number) {
  if (!receivedAt) return "Unknown";
  const age = Math.max(0, now - Date.parse(receivedAt));
  return age <= 10000 ? "Online" : age <= 15000 ? "Delayed" : "Offline";
}
export function reportAge(receivedAt: string | null, now: number) {
  return receivedAt
    ? `Last report ${Math.max(0, Math.floor((now - Date.parse(receivedAt)) / 1000))}s ago`
    : "No reports yet";
}
