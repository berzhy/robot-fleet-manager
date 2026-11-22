import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useRef } from "react";

export type DeleteTarget =
  { kind: "robot"; id: string; name: string } | { kind: "all" };

export default function DeleteRobotDialog({
  target,
  open,
  pending,
  error,
  onClearError,
  onCancel,
  onConfirm,
  onExited,
}: {
  target: DeleteTarget;
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
  const text =
    target.kind === "robot"
      ? {
          title: "Delete robot?",
          description: `Delete “${target.name}”? This cannot be undone.`,
          confirm: "Delete",
        }
      : {
          title: "Delete all robots?",
          description:
            "Delete all robots in the fleet, including those hidden by filters? This cannot be undone.",
          confirm: "Delete all robots",
        };

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
      <DialogTitle id={`${id}-title`}>{text.title}</DialogTitle>
      <DialogContent>
        <DialogContentText
          data-testid="delete-robot-description"
          id={`${id}-description`}
        >
          {text.description}
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
          {text.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
