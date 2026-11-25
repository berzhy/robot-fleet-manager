import { apiErrorBodySchema } from "@/common/schemas";

const requestTimeoutMs = 5_000;

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Our routes answer with an error body, but a failure before them can answer
// with anything, so the body is checked rather than trusted.
async function apiError(response: Response, fallbackMessage: string) {
  const body: unknown = await response.json().catch((error: unknown) => {
    // An empty or non-JSON body; a timeout while reading still rejects.
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  });
  const message = apiErrorBodySchema.safeParse(body).data?.error.message;

  return new ApiError(response.status, message ?? fallbackMessage);
}

/** A timeout aborts the request in the browser, so there is no response to read. */
export function isRequestTimeout(error: unknown) {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === "TimeoutError"
  );
}

type RequestOptions = {
  method?: "POST" | "DELETE";
  json?: unknown;
  signal?: AbortSignal;
};

export async function request(
  path: string,
  failureMessage: string,
  { method, json, signal }: RequestOptions = {},
) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    signal: requestSignal(signal),
    ...(json !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    }),
  });
  if (!response.ok) {
    throw await apiError(response, failureMessage);
  }
  return response;
}

/** The body as the caller's type: our own routes are trusted, not checked. */
export async function requestJson<T>(
  path: string,
  failureMessage: string,
  options?: RequestOptions,
): Promise<T> {
  const response = await request(path, failureMessage, options);
  return response.json() as Promise<T>;
}
