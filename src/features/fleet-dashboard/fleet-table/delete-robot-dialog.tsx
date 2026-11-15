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
  robot: Robot;
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
        transition: { onExited, onEntered: () => cancelRef.current?.focus() },
      }}
    >
      <DialogTitle id={`${id}-title`}>Delete robot?</DialogTitle>
      <DialogContent>
        <DialogContentText id={`${id}-description`}>
          Delete “{robot.name}”? This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button ref={cancelRef} disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          loading={pending}
          onClick={onConfirm}
        >
          Delete
        </Button>
      </DialogActions>
      {children}
    </Dialog>
  );
}
