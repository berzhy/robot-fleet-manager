import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderOptions,
  type RenderHookOptions,
} from "@testing-library/react";
import { notifyManager, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach } from "vitest";

import { NotificationProvider } from "@/shared/notifications/notification-provider";

import { createQueryClient } from "./query-client";

// Keep notifications within async act, including tests that control polling timers.
notifyManager.setScheduler(queueMicrotask);

const clients: ReturnType<typeof createQueryClient>[] = [];

afterEach(() => {
  for (const client of clients) {
    client.clear();
  }
  clients.length = 0;
});

function createWrapper() {
  const client = createQueryClient();
  clients.push(client);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    );
  };
}

export function render(ui: ReactNode, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: createWrapper(), ...options });
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
) {
  return rtlRenderHook(callback, { wrapper: createWrapper(), ...options });
}
