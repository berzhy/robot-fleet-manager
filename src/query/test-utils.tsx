import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderOptions,
  type RenderHookOptions,
} from "@testing-library/react";
import {
  notifyManager,
  QueryClientProvider,
  type QueryKey,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach } from "vitest";

import { NotificationProvider } from "@/shared/notifications/notification-provider";
import AppThemeProvider from "@/theme/theme-provider";

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

/** Cache entries to start with, as a server-rendered page hydrates them. */
type QueryData = [QueryKey, unknown][];

function createWrapper(queryData: QueryData = []) {
  const client = createQueryClient();
  clients.push(client);
  for (const [key, data] of queryData) {
    client.setQueryData(key, data);
  }

  // The app's theme, so components read the same theme variables as in production.
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppThemeProvider>
        <QueryClientProvider client={client}>
          <NotificationProvider>{children}</NotificationProvider>
        </QueryClientProvider>
      </AppThemeProvider>
    );
  };
}

export function render(
  ui: ReactNode,
  { queryData, ...options }: RenderOptions & { queryData?: QueryData } = {},
) {
  return rtlRender(ui, { wrapper: createWrapper(queryData), ...options });
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  {
    queryData,
    ...options
  }: RenderHookOptions<Props> & { queryData?: QueryData } = {},
) {
  return rtlRenderHook(callback, {
    wrapper: createWrapper(queryData),
    ...options,
  });
}
