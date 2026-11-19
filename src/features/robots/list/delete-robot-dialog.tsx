"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useRef } from "react";

export default function DeleteRobotDialog({
  robotName,
  open,
  pending,
  error,
  onClearError,
  onCancel,
  onConfirm,
  onExited,
}: {
  robotName?: string;
  open: boolean;
  pending: boolean;
  error?: string;
  onClearError: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onExited: () => void;
}) {
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deletingOne = robotName !== undefined;

  return (
    <Dialog
      open={open}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      // The delete flow returns focus itself: after a delete, the button that
      // opened the dialog may be gone with its row.
      disableRestoreFocus
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
      slotProps={{
        paper: () => ({ "data-testid": "delete-robot-dialog" }),
        transition: { onExited, onEntered: () => cancelRef.current?.focus() },
      }}
    >
      <DialogTitle id={`${id}-title`}>
        {deletingOne ? "Delete robot?" : "Delete all robots?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          data-testid="delete-robot-description"
          id={`${id}-description`}
        >
          {deletingOne
            ? `Delete “${robotName}”? This cannot be undone.`
            : "Delete all robots in the fleet, including those hidden by filters? This cannot be undone."}
        </DialogContentText>
        {error && (
          <Alert
            data-testid="fleet-notification"
            severity="error"
            onClose={onClearError}
            slotProps={{
              closeButton: () => ({
                "data-testid": "fleet-notification-close",
              }),
            }}
            sx={{ mt: 2 }}
          >
            {error}
          </Alert>
        )}
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
          {deletingOne ? "Delete" : "Delete all robots"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
