/**
 * Codes in the API's error body. The client branches on some of them, so both
 * sides type them from this list and a rename on either side fails to compile.
 */
export const apiErrorCodes = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "ACTION_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];
