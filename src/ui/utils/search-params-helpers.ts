import type { z } from "zod";

/**
 * Reads a URL leniently: each invalid field takes its schema default, so every
 * field must be optional or have a default.
 */
export function parseSearchParams<Schema extends z.ZodObject>(
  schema: Schema,
  searchParams: URLSearchParams,
): z.output<Schema> {
  // A repeated key keeps its last value.
  const input: Record<string, string> = Object.fromEntries(searchParams);
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  for (const { path } of result.error.issues) {
    delete input[String(path[0])];
  }
  return schema.parse(input);
}

/** Omits unset and default values to keep URLs short. */
export function toSearchParams(
  schema: z.ZodObject,
  values: Record<string, string | number | undefined>,
) {
  const defaults = schema.parse({});
  const searchParams = new URLSearchParams();

  for (const key of Object.keys(schema.shape)) {
    const value = values[key];
    if (value !== undefined && value !== defaults[key]) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}
