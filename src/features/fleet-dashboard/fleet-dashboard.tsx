"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Portal from "@mui/material/Portal";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

import type { Robot } from "@/modules/robots/robot";

import { createRobot, createRobots, deleteRobot } from "./api/robot-api";
import AddRobotSplitButton from "./fleet-table/add-robot-split-button";
import DeleteRobotDialog from "./fleet-table/delete-robot-dialog";
import FleetTable from "./fleet-table/fleet-table";
import useReportClock from "./hooks/use-report-clock";
import useRobots from "./hooks/use-robots";
import { generateRobotInput } from "./utils/generate-robot-input";

export default function FleetDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addFocusRef = useRef<HTMLElement | null>(null);
  const [adding, setAdding] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inFlightRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    robot: Robot;
    open: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const paused = adding || deleting || menuOpen || Boolean(deleteTarget);
  const now = useReportClock(paused);
  const {
    state,
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
  } = useRobots(paused);
  const [notification, setNotification] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (adding || state.status === "loading" || !addFocusRef.current) return;
    const target = addFocusRef.current;
    addFocusRef.current = null;
    (target.isConnected ? target : addButtonRef.current)?.focus();
  }, [adding, state.status]);

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

  function requestDelete(robot: Robot, trigger: HTMLButtonElement) {
    if (inFlightRef.current) return;
    invalidate();
    setNotification(null);
    returnFocusRef.current = trigger;
    setDeleteTarget({ robot, open: true });
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
      await deleteRobot(deleteTarget.robot.id);
      setNotification({
        severity: "success",
        message: `“${deleteTarget.robot.name}” deleted.`,
      });
      returnFocusRef.current = headingRef.current;
      setDeleteTarget({ ...deleteTarget, open: false });
      reload();
    } catch {
      setNotification({
        severity: "error",
        message: `Unable to delete “${deleteTarget.robot.name}”. Please try again.`,
      });
    } finally {
      inFlightRef.current = false;
      setDeleting(false);
    }
  }

  function finishDialogClose() {
    setDeleteTarget(null);
    const target = returnFocusRef.current;
    (target?.isConnected ? target : headingRef.current)?.focus();
  }

  const notice = notification && (
    <Snackbar
      key={notification.message}
      open
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      autoHideDuration={notification.severity === "success" ? 6000 : null}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") setNotification(null);
      }}
    >
      <Alert
        severity={notification.severity}
        role={notification.severity === "success" ? "status" : "alert"}
        onClose={() => setNotification(null)}
      >
        <Typography component="span" variant="body1">
          {notification.message}
        </Typography>
      </Alert>
    </Snackbar>
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
          ref={headingRef}
          tabIndex={-1}
          component="h1"
          variant="h4"
          sx={{ flexShrink: 0 }}
        >
          Fleet dashboard
        </Typography>
        <AddRobotSplitButton
          buttonRef={addButtonRef}
          loading={adding}
          disabled={state.status === "loading" || Boolean(deleteTarget)}
          onAdd={(trigger, count) => void addRobot(trigger, count)}
        />
      </Stack>
      <Box
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
        {state.status === "loading" ? "Loading robots" : ""}
      </Box>
      {interrupted && state.status === "success" && (
        <Alert severity="warning">
          Live updates interrupted. Showing last-known data and connection
          states.
        </Alert>
      )}
      <FleetTable
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
        onDelete={requestDelete}
        onAdd={(trigger) => void addRobot(trigger)}
        adding={adding}
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
