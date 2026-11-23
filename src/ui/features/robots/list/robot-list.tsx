"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { visuallyHidden } from "@mui/utils";
import Typography from "@mui/material/Typography";

import { useRememberRobotListView } from "../robot-list-return";
import { robotReading } from "../robot-reading";

import AddRobotSplitButton from "./add-robot-split-button";
import DeleteRobotDialog from "./delete-robot-dialog";
import RobotListFilters from "./filters/robot-list-filters";
import { focusSearchField } from "./filters/robot-search-field";
import RobotStatusFilters from "./filters/robot-status-filters";
import RobotTable from "./table/robot-table";
import RobotTableEmptyState from "./table/robot-table-empty-state";
import RobotTableErrorState from "./table/robot-table-error-state";
import RobotTableFooter, {
  formatResultCount,
} from "./table/robot-table-footer";
import RobotTableNoResultsState from "./table/robot-table-no-results-state";
import useAddRobots from "./use-add-robots";
import useDeleteRobotFlow from "./use-delete-robot-flow";
import useRobotList from "./use-robot-list";
import useRobotListParams from "./robot-list-url";

export default function RobotList() {
  const params = useRobotListParams();
  const { filters, pageSize } = params;
  useRememberRobotListView();
  const { data, page, isLoading, loadFailed, refreshFailed, refresh } =
    useRobotList(params);

  const { requestDelete, dialog } = useDeleteRobotFlow();
  const { addRobots, adding, addButtonRef } = useAddRobots();

  const readings =
    data?.items.map((robot) =>
      robotReading(robot, data.evaluatedAt, refreshFailed),
    ) ?? [];

  function handleFocusedRowRemoved() {
    // The delete dialog keeps focus while it is open.
    if (!dialog) {
      focusSearchField();
    }
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography component="h1" variant="h4" sx={{ flexShrink: 0 }}>
          Robots
        </Typography>
        <AddRobotSplitButton
          onDeleteAll={(trigger) => requestDelete({ kind: "all" }, trigger)}
          buttonRef={addButtonRef}
          loading={adding}
          onAdd={addRobots}
        />
      </Stack>
      <Box
        data-testid="fleet-loading"
        role="status"
        aria-label="Robot list loading status"
        aria-atomic="true"
        sx={visuallyHidden}
      >
        {loadingStatus(data?.total, isLoading)}
      </Box>
      {refreshFailed && (
        <Alert data-testid="fleet-refresh-warning" severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      {/* "clip" rounds the corners without making the card a scroll box, which
          would stop the table header sticking to the page. */}
      <Paper elevation={2} sx={{ overflow: "clip" }}>
        <Stack spacing={2} sx={{ p: 2 }}>
          <RobotStatusFilters
            view={filters.view}
            summary={data?.summary}
            isLoading={isLoading}
            loadFailed={loadFailed}
          />
          <Divider />
          <RobotListFilters filters={filters} available={data?.filterOptions} />
        </Stack>
        <RobotTable
          readings={readings}
          search={filters.search}
          isLoading={isLoading}
          pageSize={pageSize}
          onDelete={({ id, name }, trigger) =>
            requestDelete({ kind: "robot", id, name }, trigger)
          }
          onFocusedRowRemoved={handleFocusedRowRemoved}
        />
        {data?.total === 0 &&
          !isLoading &&
          (data.fleetTotal > 0 ? (
            <RobotTableNoResultsState filters={filters} />
          ) : (
            <RobotTableEmptyState onAdd={() => addRobots()} adding={adding} />
          ))}
        {loadFailed && <RobotTableErrorState onRetry={refresh} />}
        <RobotTableFooter
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          resultCount={
            data && !isLoading
              ? formatResultCount(data.total, data.summary.all, filters)
              : undefined
          }
        />
      </Paper>
      {dialog && <DeleteRobotDialog {...dialog} />}
    </Stack>
  );
}

// Read out when it changes: after loading, or when a poll changes the count.
function loadingStatus(total: number | undefined, isLoading: boolean) {
  if (isLoading) {
    return "Loading robots";
  }
  if (total === undefined) {
    return "";
  }
  return `${total} ${total === 1 ? "robot" : "robots"} found.`;
}
