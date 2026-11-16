import ExtensionIcon from "@mui/icons-material/Extension";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import HubIcon from "@mui/icons-material/Hub";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const sections = [
  { label: "Fleet", href: "/", icon: PrecisionManufacturingIcon },
  { label: "Skills", href: "/skills", icon: ExtensionIcon },
  { label: "Integrations", href: "/integrations", icon: HubIcon },
];

export default function AppNavigation({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  return (
    <Suspense
      fallback={<NavigationLinks pathname="" onNavigate={onNavigate} />}
    >
      <ActiveNavigation onNavigate={onNavigate} />
    </Suspense>
  );
}

function ActiveNavigation({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  return <NavigationLinks pathname={pathname} onNavigate={onNavigate} />;
}

function NavigationLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <List component="nav" aria-label="Main navigation">
      {sections.map(({ label, href, icon: Icon }) => {
        const selected =
          href === "/"
            ? pathname === "/" || pathname.startsWith("/robots/")
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <ListItemButton
            key={href}
            component={NextLink}
            href={href}
            selected={selected}
            aria-current={selected ? "page" : undefined}
            onClick={onNavigate}
            sx={{
              flexDirection: "column",
              gap: 0.5,
              py: 1.5,
              px: 1,
              textAlign: "center",
            }}
          >
            <ListItemIcon sx={{ minWidth: 0 }}>
              <Icon />
            </ListItemIcon>
            <ListItemText
              primary={label}
              slotProps={{ primary: { variant: "body2" } }}
              sx={{ m: 0 }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
