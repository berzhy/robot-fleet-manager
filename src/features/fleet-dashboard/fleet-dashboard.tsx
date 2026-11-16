"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Portal from "@mui/material/Portal";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

import type { RobotAction } from "@/modules/robots/robot-actions";
import type { Robot } from "@/modules/robots/robot";

import {
  createRobot,
  createRobots,
  deleteRobot,
  deleteAllRobots,
  sendRobotAction,
} from "./api/robot-api";
import ActionNotification from "./action-notification";
import AddRobotSplitButton from "./fleet-table/add-robot-split-button";
import DeleteRobotDialog from "./fleet-table/delete-robot-dialog";
import FleetFilters from "./fleet-filters/fleet-filters";
import FleetTable from "./fleet-table/fleet-table";
import useReportClock from "./hooks/use-report-clock";
import useRobots from "./hooks/use-robots";
import { generateRobotInput } from "./utils/generate-robot-input";

export default function FleetDashboard() {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addFocusRef = useRef<HTMLElement | null>(null);
  const [acting, setActing] = useState(false);
  const [adding, setAdding] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inFlightRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    robot: Robot | null;
    open: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    reload,
    invalidate,
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

  useEffect(() => {
    if (
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
    invalidate();
    inFlightRef.current = true;
    setAdding(true);
    setNotification(null);
    addFocusRef.current = trigger;
    try {
      const robots =
        count === 1
          ? [await createRobot(generateRobotInput())]
          : await createRobots(
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
      reload();
    } catch {
      setNotification({
        severity: "error",
        message:
          count === 1
            ? "Unable to add robot. Please try again."
            : "Unable to add robots. Please try again.",
      });
    } finally {
      inFlightRef.current = false;
      setAdding(false);
    }
  }

  async function actOnRobot(robot: Robot, action: RobotAction) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    invalidate();
    setActing(true);
    setNotification(null);
    try {
      await sendRobotAction(robot.id, action);
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
    } catch {
      setNotification({
        severity: "error",
        message: `Unable to request action for “${robot.name}”. Please try again.`,
      });
    } finally {
      inFlightRef.current = false;
      setActing(false);
      reload();
    }
  }

  function requestDelete(robot: Robot, trigger: HTMLButtonElement) {
    if (inFlightRef.current) return;
    invalidate();
    setNotification(null);
    returnFocusRef.current = trigger;
    setDeleteTarget({ robot, open: true });
  }

  function requestDeleteAll() {
    if (inFlightRef.current || deleteTarget) return;
    invalidate();
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
    invalidate();
    inFlightRef.current = true;
    setDeleting(true);
    try {
      if (deleteTarget.robot) await deleteRobot(deleteTarget.robot.id);
      else await deleteAllRobots();
      setNotification({
        severity: "success",
        message: deleteTarget.robot
          ? `“${deleteTarget.robot.name}” deleted.`
          : "All robots deleted.",
      });
      returnFocusRef.current = headingRef.current;
      setDeleteTarget({ ...deleteTarget, open: false });
      reload();
    } catch {
      setNotification({
        severity: "error",
        message: deleteTarget.robot
          ? `Unable to delete “${deleteTarget.robot.name}”. Please try again.`
          : "Unable to delete all robots. Please try again.",
      });
    } finally {
      inFlightRef.current = false;
      setDeleting(false);
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
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
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
      <FleetFilters
        filters={filters}
        search={search}
        onSearchChange={setSearch}
        onChange={setFilters}
        onOpenChange={setFilterOpen}
        summary={state.status === "success" ? snapshot?.summary : undefined}
        options={snapshot?.filterOptions}
      />
      <FleetTable
        search={filters.search}
        fleetTotal={snapshot?.fleetTotal}
        onClearFilters={() => {
          setSearch("");
          setFilters({ view: "all" });
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
        onRetry={reload}
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
