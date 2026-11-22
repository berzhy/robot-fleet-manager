import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

import type { RobotFilters } from "@/modules/robots/robot-filters";

import useRobotListView, {
  clearRobotListFilters,
  setRobotListFilters,
} from "../use-robot-list-view";

import { filterControlId, getFilterChips } from "./filter-fields";

export default function AppliedFilterChips({
  onDiscardSearchDraft,
}: {
  /**
   * Drops search text the debounce has not applied yet. The URL reaches the
   * search box a moment later, so without this the pending text could be
   * applied again and bring the chip back.
   */
  onDiscardSearchDraft: () => void;
}) {
  const { filters } = useRobotListView();
  const chips = getFilterChips(filters);

  if (chips.length === 0) {
    return null;
  }

  // The removed chip unmounts with focus on it: move to the next chip, so
  // keyboard users can clear one after another, or else to the filter's control.
  function remove(key: keyof RobotFilters, index: number) {
    const nextChip = chips[index + 1];

    setRobotListFilters({ [key]: key === "view" ? "all" : undefined });
    if (key === "search") {
      onDiscardSearchDraft();
    }
    focusById(nextChip ? chipId(nextChip.key) : filterControlId(key));
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ flexWrap: "wrap", alignItems: "center" }}
    >
      {chips.map((chip, index) => (
        <Chip
          key={chip.key}
          id={chipId(chip.key)}
          size="small"
          data-testid={`fleet-chip-${chip.key}`}
          label={chip.label}
          // Enter, Space and a click remove the filter too, not only Delete
          // and Backspace, and the name says what pressing it does.
          aria-label={`Remove ${chip.label} filter`}
          onClick={() => remove(chip.key, index)}
          sx={
            chip.key === "search"
              ? { maxWidth: { xs: "100%", sm: 360 } }
              : undefined
          }
          onDelete={() => remove(chip.key, index)}
        />
      ))}
      <Button
        size="small"
        onClick={() => {
          clearRobotListFilters();
          onDiscardSearchDraft();
          // This button goes away with the chips.
          focusById(filterControlId("view"));
        }}
      >
        Clear filters
      </Button>
    </Stack>
  );
}

function chipId(key: keyof RobotFilters) {
  return `fleet-chip-${key}`;
}

function focusById(id: string) {
  document.getElementById(id)?.focus();
}
