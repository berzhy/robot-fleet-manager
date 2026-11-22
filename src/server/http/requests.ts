/**
 * The request's JSON body, or `undefined` when it is not valid JSON. JSON
 * cannot encode `undefined`, so the caller's schema rejects it like any other
 * invalid body.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
