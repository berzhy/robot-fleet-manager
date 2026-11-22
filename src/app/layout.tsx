import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import QueryProvider from "@/ui/query/query-provider";
import { NotificationProvider } from "@/ui/notifications/notification-provider";

import AppShell from "@/ui/layout/app-shell";
import AppThemeProvider from "@/ui/theme/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Each page names itself first: tabs and history tell pages apart, and Next
  // announces a client navigation to screen readers only when the title changes.
  title: { template: "%s · Fleet Orchestrator", default: "Fleet Orchestrator" },
  description: "Robot fleet management dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="light" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppThemeProvider>
            <QueryProvider>
              <NotificationProvider>
                <AppShell>{children}</AppShell>
              </NotificationProvider>
            </QueryProvider>
          </AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
