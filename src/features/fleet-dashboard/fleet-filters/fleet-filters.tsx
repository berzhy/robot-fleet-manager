import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { integrationTypes, robotTypes } from "@/modules/robots/robot";
import {
  type RobotFilters,
  type FilterOptions,
} from "@/modules/robots/robot-filters";
import {
  formatIntegrationType,
  formatRobotType,
} from "../utils/robot-formatters";

function formatFilterValue(key: keyof RobotFilters, value: string) {
  if (key === "integrationType")
    return formatIntegrationType(value as (typeof integrationTypes)[number]);
  if (key === "type")
    return formatRobotType(value as (typeof robotTypes)[number]);
  return value;
}

export default function FleetFilters({
  filters,
  search,
  onSearchChange,
  options,
  onChange,
  onOpenChange,
}: {
  filters: RobotFilters;
  search: string;
  onSearchChange: (value: string) => void;
  options?: FilterOptions;
  onChange: (filters: RobotFilters) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const openSelectRef = useRef<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const anyOpen = moreAnchor !== null || openSelect !== null;
  const notifyOpen = useEffectEvent((open: boolean) => onOpenChange(open));
  useEffect(() => {
    notifyOpen(anyOpen);
  }, [anyOpen]);
  useEffect(() => () => notifyOpen(false), []);

  function setSelectOpen(key: string | null) {
    openSelectRef.current = key;
    setOpenSelect(key);
  }

  const applySearch = useEffectEvent((value: string) => {
    const normalized = value.trim();
    const applied = normalized.length >= 2 ? normalized : undefined;
    if (applied !== filters.search) onChange({ ...filters, search: applied });
  });
  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => applySearch(search), 300);
    return () => clearTimeout(timer);
  }, [search, composing]);

  function clearSearch() {
    container.current?.querySelector<HTMLElement>("#fleet-search")?.focus();
    onSearchChange("");
    if (filters.search !== undefined)
      onChange({ ...filters, search: undefined });
  }

  const primaryFields = [
    { key: "site", label: "Location", options: options?.sites ?? [] },
    { key: "type", label: "Type", options: [...robotTypes] },
  ] as const;
  const secondaryFields = [
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
  const fields = [...primaryFields, ...secondaryFields];
  const secondaryCount = secondaryFields.filter(
    (field) => filters[field.key] !== undefined,
  ).length;

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
  if (filters.search)
    chips.unshift({ key: "search", label: `Search: ${filters.search}` });
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
    const doc = container.current?.ownerDocument;
    const field =
      key === "search"
        ? container.current?.querySelector<HTMLElement>("#fleet-search")
        : key === "view"
          ? doc?.querySelector<HTMLElement>('[data-view="all"]')
          : key === "manufacturer" || key === "integrationType"
            ? moreButtonRef.current
            : container.current?.querySelector<HTMLElement>(
                `#fleet-filter-${key}`,
              );
    if (key === "search") onSearchChange("");
    onChange({ ...filters, [key]: key === "view" ? "all" : undefined });
    if (next instanceof HTMLElement && next.getAttribute("role") === "button")
      next.focus();
    else field?.focus();
  }

  function renderField(
    field: (typeof fields)[number],
    sx?: { minWidth?: number; maxWidth?: number; flex?: string },
    inPopover = false,
  ) {
    return (
      <TextField
        key={field.key}
        select
        size="small"
        variant="standard"
        disabled={!options}
        id={`fleet-filter-${field.key}`}
        label={field.label}
        value={filters[field.key] ?? ""}
        sx={sx}
        slotProps={{
          inputLabel: { shrink: true },
          select: {
            displayEmpty: true,
            onOpen: () => setSelectOpen(field.key),
            onClose: () => setSelectOpen(null),
          },
        }}
        onChange={(event) => {
          onChange({
            ...filters,
            [field.key]: event.target.value || undefined,
          });
          if (inPopover) {
            setSelectOpen(null);
            setMoreAnchor(null);
          }
        }}
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
    );
  }

  return (
    <Stack ref={container} spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          flexWrap: "wrap",
          gap: 2,
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <TextField
          id="fleet-search"
          label="Search robots"
          placeholder="Name, manufacturer, location…"
          size="small"
          variant="standard"
          value={search}
          helperText={
            search.trim().length === 1
              ? "Enter at least 2 characters"
              : undefined
          }
          onChange={(event) => {
            const value = event.target.value;
            onSearchChange(value);
            if (!value) clearSearch();
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          sx={{ flex: "0 1 300px", minWidth: 200 }}
          slotProps={{
            htmlInput: { maxLength: 100 },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    disabled={!search}
                    onClick={clearSearch}
                    sx={{ opacity: search ? 1 : 0 }}
                  >
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Stack
          direction="row"
          useFlexGap
          sx={{
            flexWrap: { xs: "wrap", md: "nowrap" },
            gap: 2,
            alignItems: "flex-end",
            justifyContent: "flex-end",
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {primaryFields.map((field) =>
            renderField(field, {
              minWidth: 120,
              maxWidth: 260,
              flex: "1 1 150px",
            }),
          )}
          <Button
            ref={moreButtonRef}
            data-testid="fleet-more-filters"
            size="small"
            variant="outlined"
            endIcon={<ArrowDropDownIcon />}
            aria-haspopup="dialog"
            aria-expanded={moreAnchor ? true : undefined}
            aria-controls={moreAnchor ? popoverId : undefined}
            onClick={(event) => setMoreAnchor(event.currentTarget)}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              mb: 0.5,
              minWidth: 176,
            }}
          >
            {secondaryCount > 0
              ? `More filters (${secondaryCount})`
              : "More filters"}
          </Button>
          <Popover
            id={popoverId}
            open={moreAnchor !== null}
            anchorEl={moreAnchor}
            onClose={(_event, reason) => {
              if (reason === "escapeKeyDown" && openSelectRef.current) return;
              setMoreAnchor(null);
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            aria-labelledby={`${popoverId}-title`}
            slotProps={{
              paper: {
                sx: { p: 2, width: 280, maxWidth: "calc(100vw - 32px)" },
              },
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography id={`${popoverId}-title`} variant="subtitle1">
                  More filters
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Close more filters"
                  onClick={() => setMoreAnchor(null)}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              {secondaryFields.map((field) =>
                renderField(field, undefined, true),
              )}
            </Stack>
          </Popover>
        </Stack>
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
              size="small"
              data-testid={`fleet-chip-${chip.key}`}
              label={chip.label}
              sx={
                chip.key === "search"
                  ? { maxWidth: { xs: "100%", sm: 360 } }
                  : undefined
              }
              onDelete={(event: React.SyntheticEvent) =>
                remove(chip.key, event.currentTarget as HTMLElement)
              }
            />
          ))}
          <Button
            size="small"
            onClick={() => {
              onSearchChange("");
              onChange({ view: "all" });
              container.current?.ownerDocument
                .querySelector<HTMLElement>('[data-view="all"]')
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
