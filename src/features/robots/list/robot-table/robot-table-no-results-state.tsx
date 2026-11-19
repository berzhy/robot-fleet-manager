import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function RobotTableNoResultsState({
  search,
  onClearSearch,
  onClearFilters,
}: {
  search?: string;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
}) {
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
            <Button onClick={onClearSearch}>Clear search</Button>
            <Button onClick={onClearFilters}>Clear filters</Button>
          </Stack>
        </>
      ) : (
        <>
          <Typography role="status">No robots match these filters.</Typography>
          <Button onClick={onClearFilters}>Clear filters</Button>
        </>
      )}
    </Stack>
  );
}
