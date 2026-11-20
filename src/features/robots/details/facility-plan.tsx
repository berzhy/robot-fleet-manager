import { useTheme } from "@mui/material/styles";

import type { FacilityLayout } from "./facility-layouts";

export default function FacilityPlan({ layout }: { layout: FacilityLayout }) {
  const theme = useTheme();
  const palette = (theme.vars ?? theme).palette;

  return (
    <g>
      <path
        d={layout.footprint}
        fill={palette.background.paper}
        fillRule="evenodd"
      />
      <path d={layout.workrooms} fill={palette.action.hover} />
      <path d={layout.commonAreas} fill={palette.info.main} opacity={0.06} />

      <g fill="none" stroke={palette.text.secondary} strokeLinejoin="round">
        <path d={layout.footprint} strokeWidth="5" />
        <path d={layout.walls} strokeWidth="3" />
      </g>

      <path
        d={layout.windows}
        fill="none"
        stroke={palette.info.main}
        strokeWidth="2"
        opacity={0.65}
      />

      <g fill={palette.action.hover} stroke={palette.divider} strokeWidth="1.5">
        {layout.warehouseRacks.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <rect width="44" height="120" rx="2" />
            <path d="M0 24h44 M0 48h44 M0 72h44 M0 96h44" />
          </g>
        ))}

        {layout.officeDesks.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <rect width="62" height="25" rx="3" />
            <path d="M31 0v25" />
            <rect x="8" y="28" width="14" height="8" rx="2" />
            <rect x="40" y="28" width="14" height="8" rx="2" />
          </g>
        ))}

        <path d={layout.fixtures} />
      </g>

      <g fill="none" stroke={palette.info.main} strokeWidth="1.8">
        {layout.chargingBays.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <rect width="28" height="42" rx="3" />
            <path d="M4 36h20 M16 7l-7 13h10l-7 12" />
          </g>
        ))}
      </g>
    </g>
  );
}
