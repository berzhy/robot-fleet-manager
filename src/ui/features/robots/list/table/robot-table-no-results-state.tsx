import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import type { RobotFilters } from "@/common/schemas";

import { focusSearchField } from "../filters/robot-search-field";
import {
  clearRobotListFilters,
  setRobotListFilters,
} from "../robot-list-url-params";

export default function RobotTableNoResultsState({
  filters: { search, view, ...fields },
}: {
  filters: RobotFilters;
}) {
  // With other filters applied, the search alone may not be what empties the list.
  const otherFilters =
    view !== "all" ||
    Object.values(fields).some((value) => value !== undefined);

  // The buttons go away with this view, so focus moves to the search box.
  function clearSearch() {
    setRobotListFilters({ search: undefined });
    focusSearchField();
  }

  function clearFilters() {
    clearRobotListFilters();
    focusSearchField();
  }

  return (
    <Stack
      data-testid="fleet-no-results"
      sx={{
        alignItems: "center",
        p: 3,
      }}
      spacing={2}
    >
      {search ? (
        <>
          <Typography
            role="status"
            align="center"
            sx={{ overflowWrap: "anywhere" }}
          >
            {otherFilters
              ? `No robots match “${search}” with the selected filters.`
              : `No robots match “${search}”.`}
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            Search matches name, manufacturer, location, area, type,
            integration, activity, problem, connection and battery.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={clearSearch}>Clear search</Button>
            {otherFilters && (
              <Button onClick={clearFilters}>Clear filters</Button>
            )}
          </Stack>
        </>
      ) : (
        <>
          <Typography role="status">No robots match these filters.</Typography>
          <Button onClick={clearFilters}>Clear filters</Button>
        </>
      )}
    </Stack>
  );
}
