"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { visuallyHidden } from "@mui/utils";
import Typography from "@mui/material/Typography";

import { useRememberRobotListView } from "../robot-list-return";

import AddRobotSplitButton from "./add-robot-split-button";
import DeleteRobotDialog from "./delete-robot-dialog";
import RobotListFilters from "./filters/robot-list-filters";
import { focusSearchField } from "./filters/robot-search-field";
import RobotStatusFilters from "./filters/robot-status-filters";
import RobotTable from "./table/robot-table";
import useAddRobots from "./use-add-robots";
import useDeleteRobotFlow from "./use-delete-robot-flow";
import useRobotList, { type RobotListResult } from "./use-robot-list";
import useRobotListParams from "./robot-list-url";

export default function RobotList() {
  const params = useRobotListParams();
  const { filters } = params;
  useRememberRobotListView();
  const list = useRobotList(params);
  const { isLoading, refreshFailed } = list;

  const { requestDelete, dialog } = useDeleteRobotFlow();
  const { addRobots, adding, addButtonRef } = useAddRobots();

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
        {loadingStatus(list)}
      </Box>
      {refreshFailed && (
        <Alert data-testid="fleet-refresh-warning" severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      <RobotTable
        params={params}
        list={list}
        toolbar={
          <Stack spacing={2}>
            <RobotStatusFilters
              view={filters.view}
              summary={list.data?.summary}
              isLoading={isLoading}
              loadFailed={list.loadFailed}
            />
            <Divider />
            <RobotListFilters
              filters={filters}
              available={list.data?.filterOptions}
            />
          </Stack>
        }
        onDelete={({ id, name }, trigger) =>
          requestDelete({ kind: "robot", id, name }, trigger)
        }
        onFocusSearch={() => {
          // The delete dialog keeps focus while it is open.
          if (!dialog) {
            focusSearchField();
          }
        }}
        onAdd={() => addRobots()}
        adding={adding}
      />
      {dialog && <DeleteRobotDialog {...dialog} />}
    </Stack>
  );
}

// Read out when it changes: after loading, or when a poll changes the count.
function loadingStatus({ data, isLoading }: RobotListResult) {
  if (isLoading) {
    return "Loading robots";
  }
  if (!data) {
    return "";
  }
  return `${data.total} ${data.total === 1 ? "robot" : "robots"} found.`;
}
