import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";

import type { RobotFilters } from "@/common/schemas";
import type { FilterOptions } from "@/common/types";

import { setRobotListFilters } from "../robot-list-url-params";

import { moreFilterFields, moreFiltersButtonId } from "./filter-fields";
import FilterSelect from "./filter-select";

export default function MoreFiltersButton({
  filters,
  available,
}: {
  filters: RobotFilters;
  available: FilterOptions | undefined;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  const titleId = `${popoverId}-title`;

  const appliedCount = moreFilterFields.filter(
    (field) => filters[field.key] !== undefined,
  ).length;

  function close() {
    setAnchor(null);
  }

  return (
    <>
      <Button
        id={moreFiltersButtonId}
        data-testid="fleet-more-filters"
        size="medium"
        variant="text"
        endIcon={anchor ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? popoverId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {appliedCount > 0 ? `More filters (${appliedCount})` : "More filters"}
      </Button>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            id: popoverId,
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": titleId,
            sx: (theme) => ({
              p: 2,
              width: 280,
              maxWidth: `calc(100vw - ${theme.spacing(4)})`,
            }),
          },
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography id={titleId} variant="subtitle1" component="h2">
              More filters
            </Typography>
            <IconButton
              size="small"
              aria-label="Close more filters"
              onClick={close}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          {moreFilterFields.map((field) => (
            <FilterSelect
              key={field.key}
              field={field}
              value={filters[field.key]}
              available={available}
              onChange={(value) => setRobotListFilters({ [field.key]: value })}
            />
          ))}
        </Stack>
      </Popover>
    </>
  );
}
