import MenuItem from "@mui/material/MenuItem";
import type { SxProps, Theme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { useState } from "react";

import type { FilterOptions } from "@/common/robots/robot-filters";

import {
  filterFieldId,
  formatFilterValue,
  type FilterField,
} from "./filter-fields";

export default function FilterSelect({
  field,
  value,
  available,
  onChange,
  sx,
}: {
  field: FilterField;
  value: string | undefined;
  /** From the parent: a list query subscribed here would refetch on mount. */
  available: FilterOptions | undefined;
  /** `undefined` when the user picks the field's "all" option. */
  onChange: (value: string | undefined) => void;
  sx?: SxProps<Theme>;
}) {
  // Keep a focused option mounted even if the next poll removes it.
  const [openOptions, setOpenOptions] = useState<readonly string[]>();

  const displayedOptions =
    openOptions ?? (available ? field.options(available) : []);
  // The current value stays selectable even if the fleet no longer has it.
  const options = [
    ...new Set([...displayedOptions, ...(value ? [value] : [])]),
  ];

  return (
    <TextField
      select
      size="small"
      variant="standard"
      disabled={!available && !openOptions}
      id={filterFieldId(field.key)}
      label={field.label}
      value={value ?? ""}
      sx={sx}
      slotProps={{
        inputLabel: { shrink: true },
        select: {
          displayEmpty: true,
          onOpen: () => setOpenOptions(displayedOptions),
          onClose: () => setOpenOptions(undefined),
        },
      }}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <MenuItem value="">{field.allLabel}</MenuItem>
      {options.map((value) => (
        <MenuItem key={value} value={value}>
          {formatFilterValue(field, value)}
        </MenuItem>
      ))}
    </TextField>
  );
}
