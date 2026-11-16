import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        networkMode: "always",
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false, networkMode: "always" },
    },
  });
}
