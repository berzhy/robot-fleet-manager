"use client";

import MenuItem from "@mui/material/MenuItem";
import type { SxProps, Theme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { useState } from "react";

import type { FilterOptions } from "@/modules/robots/robot-filters";

import useRobotListView, { setRobotListFilters } from "../use-robot-list-view";

import {
  filterFieldId,
  formatFilterValue,
  type FilterField,
} from "./filter-fields";

export default function FilterSelect({
  field,
  available,
  onSelect,
  sx,
}: {
  field: FilterField;
  /** From the parent: a list query subscribed here would refetch on mount. */
  available: FilterOptions | undefined;
  onSelect?: () => void;
  sx?: SxProps<Theme>;
}) {
  const { filters } = useRobotListView();

  // Keep a focused option mounted even if the next poll removes it.
  const [openOptions, setOpenOptions] = useState<readonly string[]>();

  const displayedOptions =
    openOptions ?? (available ? field.options(available) : []);
  const selected = filters[field.key];

  return (
    <TextField
      select
      size="small"
      variant="standard"
      disabled={!available && !openOptions}
      id={filterFieldId(field.key)}
      label={field.label}
      value={selected ?? ""}
      sx={sx}
      slotProps={{
        inputLabel: { shrink: true },
        select: {
          displayEmpty: true,
          onOpen: () => setOpenOptions(displayedOptions),
          onClose: () => setOpenOptions(undefined),
        },
      }}
      onChange={(event) => {
        setRobotListFilters({ [field.key]: event.target.value || undefined });
        onSelect?.();
      }}
    >
      <MenuItem value="">{field.allLabel}</MenuItem>
      {[...new Set([...displayedOptions, ...(selected ? [selected] : [])])].map(
        (value) => (
          <MenuItem key={value} value={value}>
            {formatFilterValue(field, value)}
          </MenuItem>
        ),
      )}
    </TextField>
  );
}
