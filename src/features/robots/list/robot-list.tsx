"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { visuallyHidden } from "@mui/utils";
import Typography from "@mui/material/Typography";
import { useRef } from "react";

import { useRobotWriteLock } from "../api/robot-mutations";

import AddRobotSplitButton from "./add-robot-split-button";
import DeleteRobotDialog from "./delete-robot-dialog";
import RobotListFilters from "./robot-list-filters/robot-list-filters";
import type { SearchFieldHandle } from "./robot-list-filters/robot-search-field";
import RobotStatusFilters from "./robot-list-filters/robot-status-filters";
import RobotTable from "./robot-table/robot-table";
import useAddRobots from "./use-add-robots";
import useDeleteRobotFlow from "./use-delete-robot-flow";
import useRobotList, {
  useRobotListAnnouncement,
  useRobotListPageCorrection,
} from "./use-robot-list";
import useRobotListView, {
  useRememberRobotListView,
} from "./use-robot-list-view";

export default function RobotList() {
  const searchFieldRef = useRef<SearchFieldHandle>(null);
  function focusSearch() {
    searchFieldRef.current?.focus();
  }

  const { filters } = useRobotListView();
  useRememberRobotListView();
  const list = useRobotList();
  const { status, refreshFailed } = list;
  const announcement = useRobotListAnnouncement(filters, list);
  useRobotListPageCorrection(list);

  const { isWritePending } = useRobotWriteLock();
  const { requestDelete, dialog } = useDeleteRobotFlow({
    focusFallback: focusSearch,
  });
  const { addRobots, adding, addButtonRef } = useAddRobots({
    blocked: dialog !== null,
  });

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          flexShrink: 0,
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
          disabled={
            isWritePending || status === "loading" || Boolean(dialog?.open)
          }
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
        {status === "loading" ? "Loading robots" : announcement}
      </Box>
      {refreshFailed && status === "success" && (
        <Alert data-testid="fleet-refresh-warning" severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      <RobotTable
        toolbar={
          <Stack spacing={2}>
            <RobotStatusFilters />
            <Divider />
            <RobotListFilters searchFieldRef={searchFieldRef} />
          </Stack>
        }
        onFocusSearch={() => {
          // The delete dialog keeps focus while it is open.
          if (!dialog) {
            focusSearch();
          }
        }}
        onDelete={({ id, name }, trigger) =>
          requestDelete({ kind: "robot", id, name }, trigger)
        }
        onAdd={(trigger) => addRobots(trigger)}
        adding={adding}
      />
      {dialog && <DeleteRobotDialog {...dialog} />}
    </Stack>
  );
}
