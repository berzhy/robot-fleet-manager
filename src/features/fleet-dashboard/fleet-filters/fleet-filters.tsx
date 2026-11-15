import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { useRef } from "react";
import { integrationTypes, robotTypes } from "@/modules/robots/robot";
import {
  fleetViews,
  type RobotFilters,
  type FleetSummary,
  type FilterOptions,
} from "@/modules/robots/robot-filters";
import {
  formatIntegrationType,
  formatRobotType,
} from "../utils/robot-formatters";

const labels = {
  all: "All robots",
  "needs-attention": "Needs attention",
  offline: "Offline",
  "low-battery": "Low battery",
};
function formatFilterValue(key: keyof RobotFilters, value: string) {
  if (key === "integrationType")
    return formatIntegrationType(value as (typeof integrationTypes)[number]);
  if (key === "type")
    return formatRobotType(value as (typeof robotTypes)[number]);
  return value;
}
const explanations = {
  all: "All robots within the selected location, manufacturer, type and integration.",
  "needs-attention":
    "Offline, a reported problem, or battery at or below 20% while not charging or returning.",
  offline:
    "Last report received more than 15 seconds ago. Robots with no reports are Unknown.",
  "low-battery":
    "Last-reported battery at or below 20%, excluding Charging and Returning.",
};
export default function FleetFilters({
  filters,
  summary,
  options,
  onChange,
  onOpenChange,
}: {
  filters: RobotFilters;
  summary?: FleetSummary;
  options?: FilterOptions;
  onChange: (filters: RobotFilters) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const fields = [
    { key: "site", label: "Location", options: options?.sites ?? [] },
    { key: "type", label: "Type", options: [...robotTypes] },
    {
      key: "manufacturer",
      label: "Manufacturer",
      options: options?.manufacturers ?? [],
    },
    {
      key: "integrationType",
      label: "Integration",
      options: [...integrationTypes],
    },
  ] as const;
  const chips: { key: keyof RobotFilters; label: string }[] = fields.flatMap(
    (field) => {
      const value = filters[field.key];
      return value
        ? [
            {
              key: field.key,
              label: `${field.label}: ${formatFilterValue(field.key, value)}`,
            },
          ]
        : [];
    },
  );
  if (filters.view !== "all")
    chips.push({
      key: "view",
      label:
        filters.view === "offline"
          ? "Connection: Offline"
          : filters.view === "low-battery"
            ? "Battery: Low"
            : "Needs attention",
    });
  function remove(key: keyof RobotFilters, button: HTMLElement) {
    const next = (button.closest('[role="button"]') ?? button)
      .nextElementSibling;
    const field =
      key === "view"
        ? container.current?.querySelector<HTMLElement>('[data-view="all"]')
        : container.current?.querySelector<HTMLElement>(`#fleet-filter-${key}`);
    onChange({ ...filters, [key]: key === "view" ? "all" : undefined });
    if (next instanceof HTMLElement && next.getAttribute("role") === "button")
      next.focus();
    else field?.focus();
  }
  return (
    <Stack ref={container} spacing={2} sx={{ flexShrink: 0 }}>
      <Box
        role="group"
        aria-label="Fleet summary filters"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
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
            >
              <Stack sx={{ alignItems: "center" }}>
                <Typography
                  variant="h5"
                  component="span"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {summary ? summary[view] : <Skeleton width={40} />}
                </Typography>
                <span>{labels[view]}</span>
              </Stack>
            </ToggleButton>
          </Tooltip>
        ))}
      </Box>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexWrap: "wrap", gap: 2, pt: 2 }}
      >
        {fields.map((field) => (
          <TextField
            key={field.key}
            select
            variant="standard"
            disabled={!options}
            id={`fleet-filter-${field.key}`}
            label={field.label}
            value={filters[field.key] ?? ""}
            sx={{ minWidth: 200 }}
            slotProps={{
              inputLabel: { shrink: true },
              select: {
                displayEmpty: true,
                onOpen: () => onOpenChange(true),
                onClose: () => onOpenChange(false),
              },
            }}
            onChange={(event) =>
              onChange({
                ...filters,
                [field.key]: event.target.value || undefined,
              })
            }
          >
            <MenuItem value="">
              All{" "}
              {field.label === "Location"
                ? "locations"
                : field.label === "Manufacturer"
                  ? "manufacturers"
                  : field.label === "Type"
                    ? "types"
                    : "integrations"}
            </MenuItem>
            {[
              ...new Set([
                ...field.options,
                ...(filters[field.key] ? [filters[field.key]!] : []),
              ]),
            ].map((value) => (
              <MenuItem key={value} value={value}>
                {formatFilterValue(field.key, value)}
              </MenuItem>
            ))}
          </TextField>
        ))}
      </Stack>
      {chips.length > 0 && (
        <Stack
          direction="row"
          useFlexGap
          sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}
        >
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              data-testid={`fleet-chip-${chip.key}`}
              label={chip.label}
              onDelete={(event: React.SyntheticEvent) =>
                remove(chip.key, event.currentTarget as HTMLElement)
              }
            />
          ))}
          <Button
            onClick={() => {
              onChange({ view: "all" });
              container.current
                ?.querySelector<HTMLElement>('[data-view="all"]')
                ?.focus();
            }}
          >
            Clear filters
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
