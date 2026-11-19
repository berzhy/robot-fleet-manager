import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import NextLink from "next/link";

import fleetLogo from "@/assets/fleet-orchestrator-logo.png";

export default function AppBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Tooltip title="Fleet Orchestrator">
      <Link
        component={NextLink}
        href="/robots"
        aria-label="Fleet Orchestrator"
        onClick={onNavigate}
      >
        <Box
          component={Image}
          src={fleetLogo}
          alt=""
          width={48}
          height={48}
          priority
          sx={[
            { display: "block", filter: "brightness(0.8)" },
            (theme) => theme.applyStyles("dark", { filter: "brightness(1.6)" }),
          ]}
        />
      </Link>
    </Tooltip>
  );
}
