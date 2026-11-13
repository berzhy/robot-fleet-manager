import Box from "@mui/material/Box";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import AppHeader from "./app-header";
import AppThemeProvider from "./theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fleet Orchestrator",
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
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppThemeProvider>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100dvh",
              }}
            >
              <AppHeader />
              <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3 } }}>
                {children}
              </Box>
            </Box>
          </AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
