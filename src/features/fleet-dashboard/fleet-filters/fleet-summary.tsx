import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import {
  fleetViews,
  type RobotFilters,
  type FleetSummary,
} from "@/modules/robots/robot-filters";
import {
  criticalBatteryPercent,
  lowBatteryPercent,
} from "@/modules/robots/robot";
import { delayedReportMaxAgeMs } from "@/modules/telemetry/freshness";

const labels = {
  all: "All robots",
  "needs-attention": "Needs attention",
  offline: "Offline",
  "low-battery": "Low battery",
};
const explanations = {
  all: "All robots within the selected location, manufacturer, type and integration.",
  "needs-attention": `Offline, a reported problem, or critical battery at or below ${criticalBatteryPercent}% while not charging.`,
  offline: `Last report received more than ${delayedReportMaxAgeMs / 1000} seconds ago. Robots with no reports are Unknown.`,
  "low-battery": `Last-reported battery at or below ${lowBatteryPercent}%, including Returning but excluding Charging.`,
};

export default function FleetSummary({
  filters,
  summary,
  updating = false,
  onChange,
}: {
  filters: RobotFilters;
  summary?: FleetSummary;
  updating?: boolean;
  onChange: (filters: RobotFilters) => void;
}) {
  return (
    <Box
      role="group"
      aria-label="Fleet summary filters"
      aria-busy={updating}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 2,
        flexShrink: 0,
      }}
    >
      {fleetViews.map((view) => (
        <Tooltip
          key={view}
          title={explanations[view]}
          placement="top"
          describeChild
        >
          <ToggleButton
            value={view}
            color="primary"
            data-view={view}
            selected={filters.view === view}
            onChange={() => {
              if (view !== filters.view) onChange({ ...filters, view });
            }}
            aria-label={labels[view]}
            sx={{ py: 1.25 }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h5"
                component="span"
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
              >
                {summary ? summary[view] : <Skeleton width={40} />}
              </Typography>
              <Typography variant="body2" component="span">
                {labels[view]}
              </Typography>
            </Stack>
          </ToggleButton>
        </Tooltip>
      ))}
    </Box>
  );
}
