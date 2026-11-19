"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import useRobotListView, {
  clearRobotListFilters,
  setRobotListFilters,
} from "../use-robot-list-view";

export default function RobotTableNoResultsState({
  onCleared,
}: {
  onCleared: () => void;
}) {
  const { search } = useRobotListView().filters;

  function clearSearch() {
    onCleared();
    setRobotListFilters({ search: undefined });
  }

  function clearFilters() {
    onCleared();
    clearRobotListFilters();
  }

  return (
    <Stack
      data-testid="fleet-no-results"
      sx={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
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
            {`No robots match “${search}”.`}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Search matches name, manufacturer, location, area, type,
            integration, activity, problem, connection and battery.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={clearSearch}>Clear search</Button>
            <Button onClick={clearFilters}>Clear filters</Button>
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
