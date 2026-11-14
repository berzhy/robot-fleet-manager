"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Toolbar from "@mui/material/Toolbar";
import Image from "next/image";
import NextLink from "next/link";

import fleetLogo from "@/assets/fleet-orchestrator-logo.png";
import ThemeToggle from "@/theme/theme-toggle";

export default function AppHeader() {
  return (
    <AppBar position="static" color="default">
      <Toolbar
        sx={{
          justifyContent: "space-between",
          gap: { xs: 1, sm: 2 },
          minHeight: 64,
        }}
      >
        <Link
          component={NextLink}
          href="/"
          variant="h6"
          color="inherit"
          underline="none"
          sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
        >
          <Box
            component={Image}
            src={fleetLogo}
            alt=""
            width={48}
            height={48}
            priority
            sx={[
              { display: "block", flexShrink: 0, filter: "brightness(0.8)" },
              (theme) =>
                theme.applyStyles("dark", { filter: "brightness(1.6)" }),
            ]}
          />
          Fleet Orchestrator
        </Link>
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
}
