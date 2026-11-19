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
import useRobotMutations from "../hooks/use-robot-mutations";

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

export default function RobotList() {
  const [search, setSearch] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);

  const { add, remove, command } = useRobotMutations();
  const adding = add.isPending;
  const acting = command.isPending;
  const deleting = remove.isPending;

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
  } = useRobotList(adding || acting || deleting);

  const [notification, setNotification] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  const { addButtonRef, rememberAddTrigger, preferAddButton } =
    useAddRobotFocus({
      inFlightRef,
      adding,
      deleteDialogActive: confirmation !== null,
      status,
    });

  async function addRobot(trigger: HTMLButtonElement, count: 1 | 10 | 100 = 1) {
    if (inFlightRef.current || confirmation || status === "loading") {
      return;
    }

    inFlightRef.current = true;
    setNotification(null);
    rememberAddTrigger(trigger);

    try {
      const robots = await add.mutateAsync(
        Array.from({ length: count }, () => generateRobotInput()),
      );

      setNotification({
        severity: "success",
        message:
          count === 1
            ? `“${robots[0].name}” added.`
            : `${robots.length} robots added.`,
      });
      preferAddButton();
    } catch (error) {
      setNotification({
        severity: "error",
        message: isRequestTimeout(error)
          ? "The add request timed out. Its outcome is uncertain; checking the fleet before you try again."
          : count === 1
            ? "Unable to add robot. Please try again."
            : "Unable to add robots. Please try again.",
      });
    } finally {
      inFlightRef.current = false;
    }
  }

  async function actOnRobot(robot: Robot, action: RobotAction) {
    if (inFlightRef.current) {
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

    inFlightRef.current = true;
    setNotification(null);

    try {
      await command.mutateAsync({ id: robot.id, action });

      const messages = {
        start: "Start requested",
        stop: "Stop requested",
        "return-to-base": "Return requested",
        retry: "Retry requested",
      };
      setNotification({
        severity: "success",
        message: `${messages[action]} for “${robot.name}”.`,
      });
    } catch (error) {
      setNotification({
        severity: "error",
        message: isRequestTimeout(error)
          ? "The command timed out. Its outcome is uncertain; checking reported activity."
          : `Unable to request action for “${robot.name}”. Please try again.`,
      });
    } finally {
      inFlightRef.current = false;
    }
  }

  function requestDelete(target: DeleteTarget, trigger: HTMLButtonElement) {
    if (inFlightRef.current || confirmation) {
      return;
    }

    setNotification(null);
    setConfirmation({ target, trigger, open: true });
  }

  function closeDeleteDialog() {
    if (!confirmation?.open || inFlightRef.current) {
      return;
    }

    setNotification(null);
    setConfirmation({ ...confirmation, open: false });
  }

  async function confirmDelete() {
    if (!confirmation?.open || inFlightRef.current) {
      return;
    }

    const { target } = confirmation;
    setNotification(null);
    inFlightRef.current = true;

    try {
      const result = await remove.mutateAsync(
        target.kind === "robot" ? target.id : null,
      );

      let message = "All robots deleted.";
      if (target.kind === "robot") {
        message =
          result === "already-removed"
            ? `“${target.name}” was already removed.`
            : `“${target.name}” deleted.`;
      }

      setNotification({ severity: "success", message });
      setConfirmation({ ...confirmation, open: false, trigger: null });
    } catch (error) {
      setNotification({
        severity: "error",
        message: isRequestTimeout(error)
          ? "The delete request timed out. Its outcome is uncertain. Checking the fleet."
          : target.kind === "robot"
            ? `Unable to delete “${target.name}”. Please try again.`
            : "Unable to delete all robots. Please try again.",
      });
    } finally {
      inFlightRef.current = false;
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
            acting || status === "loading" || Boolean(confirmation?.open)
          }
          onAdd={(trigger, count) => void addRobot(trigger, count)}
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
        onAction={(robot, action) => void actOnRobot(robot, action)}
        onDelete={({ id, name }, trigger) =>
          requestDelete({ kind: "robot", id, name }, trigger)
        }
        onAdd={(trigger) => void addRobot(trigger)}
        adding={adding || acting}
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
          onConfirm={() => void confirmDelete()}
          onExited={finishDialogClose}
        />
      )}
      {(notification?.severity === "success" || !confirmation) && (
        <Portal>{notice}</Portal>
      )}
    </Stack>
  );
}
