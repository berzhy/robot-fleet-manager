import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";

import ThemeToggle from "@/theme/theme-toggle";

import AppBrand from "./app-brand";

export default function AppHeader({
  onOpenNavigation,
}: {
  onOpenNavigation: () => void;
}) {
  return (
    <AppBar
      position="static"
      color="default"
      sx={{ display: { xs: "block", md: "none" } }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton aria-label="Open navigation" onClick={onOpenNavigation}>
          <MenuIcon />
        </IconButton>
        <AppBrand />
        <Box sx={{ flex: 1 }} />
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
}
