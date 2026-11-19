"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLayoutEffect, useRef, useState } from "react";

import { appliedSearch } from "@/modules/robots/robot-list-params";
import { useNotifications } from "@/shared/notifications/notification-provider";

import { isRequestTimeout } from "../api/robot-api";
import {
  useCreateRobots,
  useDeleteAllRobots,
  useDeleteRobot,
  useRobotWriteLock,
} from "../api/robot-mutations";

import AddRobotSplitButton from "./add-robot-split-button";
import DeleteRobotDialog from "./delete-robot-dialog";
import { generateRobotInput } from "./generate-robot-input";
import RobotListFilters from "./robot-list-filters/robot-list-filters";
import RobotStatusFilters from "./robot-list-filters/robot-status-filters";
import RobotTable from "./robot-table/robot-table";
import useAddRobotFocus from "./use-add-robot-focus";
import useRobotList, {
  useRobotListAnnouncement,
  useRobotListPageCorrection,
} from "./use-robot-list";
import useRobotListView, {
  clearRobotListFilters,
  setRobotListFilters,
} from "./use-robot-list-view";

type DeleteTarget =
  { kind: "robot"; id: string; name: string } | { kind: "all" };

export default function RobotList() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const createRobots = useCreateRobots();
  const deleteRobot = useDeleteRobot();
  const deleteAllRobots = useDeleteAllRobots();
  const notifications = useNotifications();

  const { isWritePending, isWritePendingNow } = useRobotWriteLock();
  const adding = createRobots.isPending;
  const deleting = deleteRobot.isPending || deleteAllRobots.isPending;

  const [confirmation, setConfirmation] = useState<{
    target: DeleteTarget;
    trigger: HTMLButtonElement | null;
    open: boolean;
  } | null>(null);

  const { filters } = useRobotListView();
  const { status, refreshFailed } = useRobotList();
  const announcement = useRobotListAnnouncement();
  useRobotListPageCorrection();

  // What the user types. The applied search (debounced, 2+ characters) lives in the URL.
  const [search, setSearch] = useState(filters.search ?? "");
  // The URL search the box last agreed with. When the URL moves to a search the
  // box's text would not apply (a link, Back), the box follows it.
  const [syncedSearch, setSyncedSearch] = useState(filters.search);
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    if (filters.search !== appliedSearch(search)) {
      setSearch(filters.search ?? "");
    }
  }

  // Next keeps this page alive while hidden. Forget unsent text so it is not
  // applied on return; the box then re-reads the URL.
  useLayoutEffect(
    () => () => {
      setSearch("");
      setSyncedSearch(undefined);
    },
    [],
  );

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { addButtonRef, rememberAddTrigger, preferAddButton } =
    useAddRobotFocus({
      isWritePending,
      deleteDialogActive: confirmation !== null,
      status,
    });

  function addRobot(trigger: HTMLButtonElement, count: 1 | 10 | 100 = 1) {
    if (isWritePendingNow() || confirmation || status === "loading") {
      return;
    }

    notifications.clear();
    rememberAddTrigger(trigger);

    createRobots.mutate(
      Array.from({ length: count }, () => generateRobotInput()),
      {
        onSuccess: (robots) => {
          notifications.show({
            severity: "success",
            message:
              count === 1
                ? `“${robots[0].name}” added.`
                : `${robots.length} robots added.`,
          });
          preferAddButton();
        },
        onError: (error) => {
          notifications.show({
            severity: "error",
            message: isRequestTimeout(error)
              ? "The add request timed out, so its outcome is uncertain. The list shows the latest fleet state; check it before you try again."
              : count === 1
                ? "Unable to add robot. Please try again."
                : "Unable to add robots. Please try again.",
          });
        },
      },
    );
  }

  function requestDelete(target: DeleteTarget, trigger: HTMLButtonElement) {
    if (isWritePendingNow() || confirmation) {
      return;
    }

    notifications.clear();
    setDeleteError(null);
    setConfirmation({ target, trigger, open: true });
  }

  function closeDeleteDialog() {
    if (!confirmation?.open || isWritePendingNow()) {
      return;
    }

    setDeleteError(null);
    setConfirmation({ ...confirmation, open: false });
  }

  function confirmDelete() {
    if (!confirmation?.open || isWritePendingNow()) {
      return;
    }

    const { target } = confirmation;
    notifications.clear();
    setDeleteError(null);

    function handleDeleted(message: string) {
      notifications.show({ severity: "success", message });
      setConfirmation(
        (current) => current && { ...current, open: false, trigger: null },
      );
    }

    function handleDeleteError(error: Error) {
      setDeleteError(
        isRequestTimeout(error)
          ? "The delete request timed out, so its outcome is uncertain. The list shows the latest fleet state."
          : target.kind === "robot"
            ? `Unable to delete “${target.name}”. Please try again.`
            : "Unable to delete all robots. Please try again.",
      );
    }

    if (target.kind === "robot") {
      deleteRobot.mutate(target.id, {
        onSuccess: (result) =>
          handleDeleted(
            result === "already-removed"
              ? `“${target.name}” was already removed.`
              : `“${target.name}” deleted.`,
          ),
        onError: handleDeleteError,
      });
    } else {
      deleteAllRobots.mutate(undefined, {
        onSuccess: () => handleDeleted("All robots deleted."),
        onError: handleDeleteError,
      });
    }
  }

  function focusSearch() {
    searchInputRef.current?.focus();
  }

  function finishDialogClose() {
    const trigger = confirmation?.trigger;
    if (trigger?.isConnected && !trigger.disabled) {
      trigger.focus();
    } else {
      focusSearch();
    }

    setConfirmation(null);
  }

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
            isWritePending ||
            status === "loading" ||
            Boolean(confirmation?.open)
          }
          onAdd={addRobot}
        />
      </Stack>
      <Box
        data-testid="fleet-loading"
        role="status"
        aria-label="Robot list loading status"
        aria-atomic="true"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          p: 0,
          m: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
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
            <RobotListFilters
              search={search}
              searchInputRef={searchInputRef}
              onSearchChange={setSearch}
            />
          </Stack>
        }
        onClearFilters={() => {
          focusSearch();
          setSearch("");
          clearRobotListFilters();
        }}
        onClearSearch={() => {
          focusSearch();
          setSearch("");
          setRobotListFilters({ search: undefined });
        }}
        onRowFocusLost={confirmation ? undefined : focusSearch}
        onDelete={({ id, name }, trigger) =>
          requestDelete({ kind: "robot", id, name }, trigger)
        }
        onAdd={(trigger) => addRobot(trigger)}
        adding={adding}
      />
      {confirmation && (
        <DeleteRobotDialog
          robotName={
            confirmation.target.kind === "robot"
              ? confirmation.target.name
              : undefined
          }
          open={confirmation.open}
          pending={deleting}
          error={deleteError ?? undefined}
          onClearError={() => setDeleteError(null)}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDelete}
          onExited={finishDialogClose}
        />
      )}
    </Stack>
  );
}
