"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createQueryClient } from "./query-client";

let browserClient: ReturnType<typeof createQueryClient> | undefined;

export default function QueryProvider({ children }: { children: ReactNode }) {
  const client =
    typeof window === "undefined"
      ? createQueryClient()
      : (browserClient ??= createQueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
