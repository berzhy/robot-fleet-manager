import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Polling already asks again every few seconds; a retry would only
        // delay the "Live updates interrupted" warning.
        retry: false,
        // Run and fail visibly when the browser reports it is offline, rather
        // than pausing in silence.
        networkMode: "always",
      },
      mutations: { networkMode: "always" },
    },
  });
}
