"use client";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { integrationTypes, robotTypes } from "@/modules/robots/robot";
import type { RobotFilters } from "@/modules/robots/robot-filters";
import { appliedSearch } from "@/modules/robots/robot-list-params";

import {
  formatIntegrationType,
  formatRobotType,
} from "../../utils/robot-formatters";
import useRobotList from "../use-robot-list";
import useRobotListView, {
  clearRobotListFilters,
  setRobotListFilters,
} from "../use-robot-list-view";

const searchDebounceMs = 300;

function formatFilterValue(key: keyof RobotFilters, value: string) {
  if (key === "integrationType") {
    return formatIntegrationType(value as (typeof integrationTypes)[number]);
  }
  if (key === "type") {
    return formatRobotType(value as (typeof robotTypes)[number]);
  }
  return value;
}

export default function RobotListFilters({
  searchInputRef,
}: {
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  const { filters } = useRobotListView();
  const options = useRobotList().snapshot?.filterOptions;

  // The box holds what the user types; the URL holds the applied search.
  const [search, setSearch] = useState(filters.search ?? "");
  const [urlSearch, setUrlSearch] = useState(filters.search);
  const [ownSearch, setOwnSearch] = useState(filters.search);

  // Next re-renders URL readers a moment after replaceState, so the box may be
  // ahead of the URL. Only a URL search this box did not apply (a link, Back)
  // replaces what the user typed.
  if (filters.search !== urlSearch) {
    setUrlSearch(filters.search);
    if (filters.search !== ownSearch) {
      setOwnSearch(filters.search);
      setSearch(filters.search ?? "");
    }
  }

  // Next keeps this page alive while hidden. Drop unsent text so it is not
  // applied on return; the box then reads the URL again.
  useLayoutEffect(
    () => () => {
      setSearch("");
      setUrlSearch(undefined);
      setOwnSearch(undefined);
    },
    [],
  );

  const [composing, setComposing] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [openFilter, setOpenFilter] = useState<{
    key: keyof RobotFilters;
    options: readonly string[];
  } | null>(null);

  const container = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const popoverTitleId = `${popoverId}-title`;

  const applySearch = useEffectEvent((value: string) => {
    const applied = appliedSearch(value);
    if (applied !== ownSearch) {
      writeSearch(applied);
    }
  });

  useEffect(() => {
    if (composing) {
      return;
    }
    const timer = setTimeout(() => applySearch(search), searchDebounceMs);

    // Writing the URL cancels a navigation already under way, so a click on a
    // link (the user is leaving) drops the pending search.
    function cancelOnLinkClick(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest("a[href]")) {
        clearTimeout(timer);
      }
    }
    document.addEventListener("click", cancelOnLinkClick, { capture: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", cancelOnLinkClick, {
        capture: true,
      });
    };
  }, [search, composing]);

  function writeSearch(value: string | undefined) {
    setOwnSearch(value);
    setRobotListFilters({ search: value });
  }

  function clearSearch() {
    searchInputRef.current?.focus();
    setSearch("");
    if (ownSearch !== undefined) {
      writeSearch(undefined);
    }
  }

  function closeMoreFilters() {
    setMoreAnchor(null);
    setOpenFilter(null);
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
  if (filters.search) {
    chips.unshift({ key: "search", label: `Search: ${filters.search}` });
  }
  if (filters.view !== "all") {
    chips.push({
      key: "view",
      label:
        filters.view === "offline"
          ? "Connection: Offline"
          : filters.view === "low-battery"
            ? "Battery: Low"
            : "Needs attention",
    });
  }

  function remove(key: keyof RobotFilters, button: HTMLElement) {
    const next = (button.closest('[role="button"]') ?? button)
      .nextElementSibling;
    const doc = container.current?.ownerDocument;
    const field =
      key === "search"
        ? searchInputRef.current
        : key === "view"
          ? doc?.querySelector<HTMLElement>('[data-view="all"]')
          : key === "manufacturer" || key === "integrationType"
            ? moreButtonRef.current
            : container.current?.querySelector<HTMLElement>(
                `#fleet-filter-${key}`,
              );

    if (key === "search") {
      setSearch("");
      writeSearch(undefined);
    } else {
      setRobotListFilters({ [key]: key === "view" ? "all" : undefined });
    }

    if (next instanceof HTMLElement && next.getAttribute("role") === "button") {
      next.focus();
    } else {
      field?.focus();
    }
  }

  function renderField(
    field: (typeof fields)[number],
    sx?: { minWidth?: number; maxWidth?: number; flex?: string },
    inPopover = false,
  ) {
    // Keep a focused option mounted even if the next poll removes it.
    const openOptions =
      openFilter?.key === field.key ? openFilter.options : undefined;
    const displayedOptions = openOptions ?? field.options;
    const selected = filters[field.key];

    return (
      <TextField
        key={field.key}
        select
        size="small"
        variant="standard"
        disabled={!options && !openOptions}
        id={`fleet-filter-${field.key}`}
        label={field.label}
        value={selected ?? ""}
        sx={sx}
        slotProps={{
          inputLabel: { shrink: true },
          select: {
            displayEmpty: true,
            onOpen: () =>
              setOpenFilter({ key: field.key, options: displayedOptions }),
            onClose: () => setOpenFilter(null),
          },
        }}
        onChange={(event) => {
          setRobotListFilters({
            [field.key]: event.target.value || undefined,
          });
          if (inPopover) {
            closeMoreFilters();
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
          ...new Set([...displayedOptions, ...(selected ? [selected] : [])]),
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
        spacing={2}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <TextField
          id="fleet-search"
          inputRef={searchInputRef}
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
            setSearch(value);
            if (!value) {
              clearSearch();
            }
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
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{
            flexWrap: { xs: "wrap", md: "nowrap" },
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
            size="medium"
            variant="text"
            endIcon={moreAnchor ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
            aria-haspopup="dialog"
            aria-expanded={moreAnchor !== null}
            aria-controls={moreAnchor ? popoverId : undefined}
            onClick={(event) => setMoreAnchor(event.currentTarget)}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {secondaryCount > 0
              ? `More filters (${secondaryCount})`
              : "More filters"}
          </Button>
          <Popover
            open={moreAnchor !== null}
            anchorEl={moreAnchor}
            onClose={closeMoreFilters}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{
              paper: {
                id: popoverId,
                role: "dialog",
                "aria-modal": true,
                "aria-labelledby": popoverTitleId,
                sx: { p: 2, width: 280, maxWidth: "calc(100vw - 32px)" },
              },
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography id={popoverTitleId} variant="subtitle1">
                  More filters
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Close more filters"
                  onClick={closeMoreFilters}
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
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
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
              setSearch("");
              setOwnSearch(undefined);
              clearRobotListFilters();
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
