"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Portal from "@mui/material/Portal";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";

import type { Robot } from "@/modules/robots/robot";
import {
  actionUnavailable,
  type RobotAction,
} from "@/modules/robots/robot-actions";

import ActionNotification from "../action-notification";
import { isRequestTimeout } from "../api/robot-api";
import {
  useCreateRobots,
  useDeleteAllRobots,
  useDeleteRobot,
  useRobotCommand,
  useRobotWriteLock,
} from "../api/robot-mutations";

import AddRobotSplitButton from "./add-robot-split-button";
import DeleteRobotDialog from "./delete-robot-dialog";
import { generateRobotInput } from "./generate-robot-input";
import RobotListFilters from "./robot-list-filters/robot-list-filters";
import RobotStatusFilters from "./robot-list-filters/robot-status-filters";
import RobotTable from "./robot-table/robot-table";
import useAddRobotFocus from "./use-add-robot-focus";
import useRobotList from "./use-robot-list";

type DeleteTarget =
  { kind: "robot"; id: string; name: string } | { kind: "all" };

const actionRequestedMessages: Record<RobotAction, string> = {
  start: "Start requested",
  stop: "Stop requested",
  "return-to-base": "Return requested",
  retry: "Retry requested",
};

export default function RobotList() {
  const [search, setSearch] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const createRobots = useCreateRobots();
  const deleteRobot = useDeleteRobot();
  const deleteAllRobots = useDeleteAllRobots();
  const command = useRobotCommand();

  const { isWritePending, isWritePendingNow } = useRobotWriteLock();
  const adding = createRobots.isPending;
  const deleting = deleteRobot.isPending || deleteAllRobots.isPending;

  const [confirmation, setConfirmation] = useState<{
    target: DeleteTarget;
    trigger: HTMLButtonElement | null;
    open: boolean;
  } | null>(null);

  const {
    status,
    announcement,
    page,
    pageSize,
    setPage,
    setPageSize,
    refresh,
    refreshFailed,
    snapshot,
    filters,
    setFilters,
  } = useRobotList();

  const [notification, setNotification] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

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

    setNotification(null);
    rememberAddTrigger(trigger);

    createRobots.mutate(
      Array.from({ length: count }, () => generateRobotInput()),
      {
        onSuccess: (robots) => {
          setNotification({
            severity: "success",
            message:
              count === 1
                ? `“${robots[0].name}” added.`
                : `${robots.length} robots added.`,
          });
          preferAddButton();
        },
        onError: (error) => {
          setNotification({
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

  function actOnRobot(robot: Robot, action: RobotAction) {
    if (isWritePendingNow()) {
      return;
    }

    const reason = actionUnavailable(robot, action, Date.now());
    if (reason) {
      setNotification({
        severity: "error",
        message: `${reason}. Check the latest report before trying again.`,
      });
      return;
    }

    setNotification(null);

    command.mutate(
      { id: robot.id, action },
      {
        onSuccess: () => {
          setNotification({
            severity: "success",
            message: `${actionRequestedMessages[action]} for “${robot.name}”.`,
          });
        },
        onError: (error) => {
          setNotification({
            severity: "error",
            message: isRequestTimeout(error)
              ? "The command timed out, so its outcome is uncertain. Check the reported activity before trying again."
              : `Unable to request action for “${robot.name}”. Please try again.`,
          });
        },
      },
    );
  }

  function requestDelete(target: DeleteTarget, trigger: HTMLButtonElement) {
    if (isWritePendingNow() || confirmation) {
      return;
    }

    setNotification(null);
    setConfirmation({ target, trigger, open: true });
  }

  function closeDeleteDialog() {
    if (!confirmation?.open || isWritePendingNow()) {
      return;
    }

    setNotification(null);
    setConfirmation({ ...confirmation, open: false });
  }

  function confirmDelete() {
    if (!confirmation?.open || isWritePendingNow()) {
      return;
    }

    const { target } = confirmation;
    setNotification(null);

    function handleDeleted(message: string) {
      setNotification({ severity: "success", message });
      setConfirmation(
        (current) => current && { ...current, open: false, trigger: null },
      );
    }

    function handleDeleteError(error: Error) {
      setNotification({
        severity: "error",
        message: isRequestTimeout(error)
          ? "The delete request timed out, so its outcome is uncertain. The list shows the latest fleet state."
          : target.kind === "robot"
            ? `Unable to delete “${target.name}”. Please try again.`
            : "Unable to delete all robots. Please try again.",
      });
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

  const notice = notification && (
    <ActionNotification
      {...notification}
      onClose={() => setNotification(null)}
    />
  );

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
        filters={filters}
        snapshot={snapshot}
        status={status}
        toolbar={
          <Stack spacing={2}>
            <RobotStatusFilters
              filters={filters}
              onChange={setFilters}
              summary={snapshot?.summary}
              updating={status === "loading"}
            />
            <Divider />
            <RobotListFilters
              filters={filters}
              search={search}
              searchInputRef={searchInputRef}
              onSearchChange={setSearch}
              onChange={setFilters}
              options={snapshot?.filterOptions}
            />
          </Stack>
        }
        onClearFilters={() => {
          focusSearch();
          setSearch("");
          setFilters({ view: "all" });
        }}
        onClearSearch={() => {
          focusSearch();
          setSearch("");
          setFilters({ ...filters, search: undefined });
        }}
        onRowFocusLost={confirmation ? undefined : focusSearch}
        unverified={refreshFailed}
        page={page}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={setPage}
        onRetry={refresh}
        onAction={actOnRobot}
        onDelete={({ id, name }, trigger) =>
          requestDelete({ kind: "robot", id, name }, trigger)
        }
        onAdd={(trigger) => addRobot(trigger)}
        adding={adding}
        actionsDisabled={isWritePending}
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
          error={
            notification?.severity === "error"
              ? notification.message
              : undefined
          }
          onClearError={() => setNotification(null)}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDelete}
          onExited={finishDialogClose}
        />
      )}
      {(notification?.severity === "success" || !confirmation) && (
        <Portal>{notice}</Portal>
      )}
    </Stack>
  );
}
