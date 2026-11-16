"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Portal from "@mui/material/Portal";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

import type { Robot } from "@/modules/robots/robot";
import type { RobotAction } from "@/modules/robots/robot-actions";

import ActionNotification from "./action-notification";
import { isRequestTimeout } from "./api/robot-api";
import useRobotMutations from "./hooks/use-robot-mutations";
import FleetFilters from "./fleet-filters/fleet-filters";
import FleetSummary from "./fleet-filters/fleet-summary";
import AddRobotSplitButton from "./fleet-table/add-robot-split-button";
import DeleteRobotDialog from "./fleet-table/delete-robot-dialog";
import FleetTable from "./fleet-table/fleet-table";
import useReportClock from "./hooks/use-report-clock";
import useRobots from "./hooks/use-robots";
import { generateRobotInput } from "./utils/generate-robot-input";
import { formatResultCount } from "./utils/robot-formatters";

export default function FleetDashboard() {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addFocusRef = useRef<HTMLElement | null>(null);
  const { add, remove, command } = useRobotMutations();
  const adding = add.isPending;
  const acting = command.isPending;
  const deleting = remove.isPending;

  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inFlightRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    robot: Robot | null;
    open: boolean;
  } | null>(null);

  const paused =
    acting ||
    adding ||
    deleting ||
    menuOpen ||
    filterOpen ||
    Boolean(deleteTarget);
  const now = useReportClock(paused);
  const {
    state,
    announcement,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    refresh,
    cancelRefresh,
    interrupted,
    unverified,
    verifiedAt,
    snapshot,
    filters,
    setFilters,
  } = useRobots(paused);

  const [notification, setNotification] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  // Restore focus only once mutations, loading, and the delete dialog
  // settle; a poll may have replaced the recorded trigger meanwhile.
  useEffect(() => {
    if (
      inFlightRef.current ||
      adding ||
      deleteTarget ||
      state.status === "loading" ||
      !addFocusRef.current
    )
      return;
    const target = addFocusRef.current;
    addFocusRef.current = null;
    (target.isConnected ? target : addButtonRef.current)?.focus();
  }, [adding, deleteTarget, state.status]);

  async function addRobot(trigger: HTMLButtonElement, count: 1 | 10 | 100 = 1) {
    if (inFlightRef.current || deleteTarget || state.status === "loading")
      return;

    cancelRefresh();
    inFlightRef.current = true;
    setNotification(null);
    addFocusRef.current = trigger;

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
      addFocusRef.current = addButtonRef.current;
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
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    cancelRefresh();
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

  function requestDelete(robot: Robot, trigger: HTMLButtonElement) {
    if (inFlightRef.current) return;
    cancelRefresh();
    setNotification(null);
    returnFocusRef.current = trigger;
    setDeleteTarget({ robot, open: true });
  }

  function requestDeleteAll() {
    if (inFlightRef.current || deleteTarget) return;
    cancelRefresh();
    setNotification(null);
    returnFocusRef.current = addButtonRef.current;
    setDeleteTarget({ robot: null, open: true });
  }

  function closeDeleteDialog() {
    if (inFlightRef.current) return;
    setDeleteTarget((target) => (target ? { ...target, open: false } : null));
  }

  async function confirmDelete() {
    if (!deleteTarget?.open || inFlightRef.current) return;

    setNotification(null);
    cancelRefresh();
    inFlightRef.current = true;

    try {
      await remove.mutateAsync(deleteTarget.robot?.id ?? null);

      setNotification({
        severity: "success",
        message: deleteTarget.robot
          ? `“${deleteTarget.robot.name}” deleted.`
          : "All robots deleted.",
      });
      returnFocusRef.current = headingRef.current;
      setDeleteTarget({ ...deleteTarget, open: false });
    } catch (error) {
      setNotification({
        severity: "error",
        message: isRequestTimeout(error)
          ? "The delete request timed out. Its outcome is uncertain; close this dialog to refresh the fleet before trying again."
          : deleteTarget.robot
            ? `Unable to delete “${deleteTarget.robot.name}”. Please try again.`
            : "Unable to delete all robots. Please try again.",
      });
    } finally {
      inFlightRef.current = false;
    }
  }

  function finishDialogClose() {
    setDeleteTarget(null);
    const target = returnFocusRef.current;
    if (target === addButtonRef.current) {
      addFocusRef.current = target;
      return;
    }
    (target?.isConnected ? target : headingRef.current)?.focus();
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
        useFlexGap
        sx={{
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          data-testid="fleet-heading"
          ref={headingRef}
          tabIndex={-1}
          component="h1"
          variant="h4"
          sx={{ flexShrink: 0 }}
        >
          Fleet dashboard
        </Typography>
        <AddRobotSplitButton
          onDeleteAll={requestDeleteAll}
          buttonRef={addButtonRef}
          loading={adding}
          disabled={
            acting || state.status === "loading" || Boolean(deleteTarget)
          }
          onAdd={(trigger, count) => void addRobot(trigger, count)}
        />
      </Stack>
      <Box
        data-testid="fleet-loading"
        role="status"
        aria-label="Fleet loading status"
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
        {state.status === "loading" ? "Loading robots" : announcement}
      </Box>
      {interrupted && state.status === "success" && (
        <Alert data-testid="fleet-refresh-warning" severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      <FleetTable
        resultCount={
          state.status === "success" && snapshot
            ? formatResultCount(total, snapshot.summary.all, filters)
            : undefined
        }
        toolbar={
          <Stack spacing={2}>
            <FleetSummary
              filters={filters}
              onChange={setFilters}
              summary={snapshot?.summary}
              updating={state.status === "loading"}
            />
            <Divider />
            <FleetFilters
              filters={filters}
              search={search}
              onSearchChange={setSearch}
              onChange={setFilters}
              onOpenChange={setFilterOpen}
              options={snapshot?.filterOptions}
            />
          </Stack>
        }
        search={filters.search}
        fleetTotal={snapshot?.fleetTotal}
        onClearFilters={() => {
          setSearch("");
          setFilters({ view: "all" });
        }}
        onClearSearch={() => {
          setSearch("");
          setFilters({ ...filters, search: undefined });
        }}
        headingRef={headingRef}
        now={now}
        verifiedAt={verifiedAt}
        unverified={unverified}
        onMenuOpenChange={setMenuOpen}
        state={state}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={setPage}
        onRetry={refresh}
        onAction={(robot, action) => void actOnRobot(robot, action)}
        onDelete={requestDelete}
        onAdd={(trigger) => void addRobot(trigger)}
        adding={adding || acting}
      />
      {deleteTarget && (
        <DeleteRobotDialog
          robot={deleteTarget.robot}
          open={deleteTarget.open}
          pending={deleting}
          onCancel={closeDeleteDialog}
          onConfirm={() => void confirmDelete()}
          onExited={finishDialogClose}
        >
          {notification?.severity === "error" ? notice : null}
        </DeleteRobotDialog>
      )}
      {(notification?.severity === "success" || !deleteTarget) && (
        <Portal>{notice}</Portal>
      )}
    </Stack>
  );
}
