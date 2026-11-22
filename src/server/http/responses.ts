export function jsonResponse(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** The status says what failed; the message says it in the operator's words. */
export function errorResponse(status: number, message: string) {
  return jsonResponse({ error: { message } }, status);
}
