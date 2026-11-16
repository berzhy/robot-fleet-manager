"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { type ReactNode, useId, useRef } from "react";

import type { Robot } from "@/modules/robots/robot";

export default function DeleteRobotDialog({
  robot,
  open,
  pending,
  onCancel,
  onConfirm,
  onExited,
  children,
}: {
  children?: ReactNode;
  robot: Robot | null;
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onExited: () => void;
}) {
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      disableRestoreFocus
      onClose={() => {
        if (!pending) onCancel();
      }}
      slotProps={{
        paper: () => ({ "data-testid": "delete-robot-dialog" }),
        transition: { onExited, onEntered: () => cancelRef.current?.focus() },
      }}
    >
      <DialogTitle id={`${id}-title`}>
        {robot ? "Delete robot?" : "Delete all robots?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          data-testid="delete-robot-description"
          id={`${id}-description`}
        >
          {robot
            ? `Delete “${robot.name}”? This cannot be undone.`
            : "Delete all robots in the fleet, including those hidden by filters? This cannot be undone."}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="delete-robot-cancel"
          ref={cancelRef}
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          data-testid="delete-robot-confirm"
          variant="contained"
          color="error"
          loading={pending}
          onClick={onConfirm}
        >
          {robot ? "Delete" : "Delete all robots"}
        </Button>
      </DialogActions>
      {children}
    </Dialog>
  );
}
