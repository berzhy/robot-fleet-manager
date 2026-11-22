import type { ApiErrorCode } from "@/common/api/api-errors";

export function jsonResponse(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
) {
  return jsonResponse({ error: { code, message } }, status);
}
