"use client";

import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Link from "@mui/material/Link";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useState, type ReactNode } from "react";

import ThemeToggle from "@/theme/theme-toggle";

import AppBrand from "./app-brand";
import AppHeader from "./app-header";
import AppNavigation from "./app-navigation";

const sidebarWidth = 100;

export default function AppShell({ children }: { children: ReactNode }) {
  const desktop = useMediaQuery((theme) => theme.breakpoints.up("md"));
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigation = (
    // Logo and theme toggle sit inside the landmark, not loose on the page.
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <AppBrand onNavigate={() => setNavigationOpen(false)} />
      </Box>
      <AppNavigation onNavigate={() => setNavigationOpen(false)} />
      <Box
        sx={{
          mt: "auto",
          p: 2,
          justifyContent: "center",
          display: { xs: "none", md: "flex" },
        }}
      >
        <ThemeToggle />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100dvh" }}>
      <Link
        href="#main-content"
        sx={{
          position: "fixed",
          top: (theme) => theme.spacing(1),
          left: (theme) => theme.spacing(1),
          zIndex: (theme) => theme.zIndex.modal + 1,
          bgcolor: "background.paper",
          p: 1,
          transform: "translateY(-200%)",
          "&:focus": { transform: "translateY(0)" },
        }}
      >
        Skip to main content
      </Link>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: sidebarWidth,
          flexShrink: 0,
        }}
        slotProps={{ paper: { sx: { width: sidebarWidth } } }}
      >
        {navigation}
      </Drawer>
      <Drawer
        open={navigationOpen && !desktop}
        onClose={() => setNavigationOpen(false)}
        sx={{ display: { xs: "block", md: "none" } }}
        // MUI makes the open drawer a dialog, which needs a name.
        slotProps={{
          paper: { "aria-label": "Navigation", sx: { width: sidebarWidth } },
        }}
      >
        {navigation}
      </Drawer>
      <Box
        sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}
      >
        <AppHeader onOpenNavigation={() => setNavigationOpen(true)} />
        <Box
          id="main-content"
          tabIndex={-1}
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            // Less above and below than at the sides, so a 10-row page fits
            // without scrolling on a laptop screen.
            px: { xs: 2, sm: 3 },
            py: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
