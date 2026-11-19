"use client";

import { useState, type ComponentProps } from "react";

import { useNotifications } from "@/shared/notifications/notification-provider";

import { isRequestTimeout } from "../api/robot-api";
import {
  useDeleteAllRobots,
  useDeleteRobot,
  useRobotWriteLock,
} from "../api/robot-mutations";

import type DeleteRobotDialog from "./delete-robot-dialog";

type DeleteTarget =
  { kind: "robot"; id: string; name: string } | { kind: "all" };

/**
 * Confirm, delete, report. The dialog owns its error so it stays next to the
 * buttons that retry; success goes to the app notification.
 */
export default function useDeleteRobotFlow({
  focusFallback,
}: {
  /** Where focus goes when the button that opened the dialog is gone. */
  focusFallback: () => void;
}) {
  const deleteRobot = useDeleteRobot();
  const deleteAllRobots = useDeleteAllRobots();
  const notifications = useNotifications();
  const { isWritePendingNow } = useRobotWriteLock();

  // Kept after close until the exit transition ends, so focus returns afterwards.
  const [confirmation, setConfirmation] = useState<{
    target: DeleteTarget;
    trigger: HTMLButtonElement | null;
    open: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function requestDelete(target: DeleteTarget, trigger: HTMLButtonElement) {
    if (isWritePendingNow() || confirmation) {
      return;
    }

    notifications.clear();
    setError(null);
    setConfirmation({ target, trigger, open: true });
  }

  function cancel() {
    if (!confirmation?.open || isWritePendingNow()) {
      return;
    }

    setError(null);
    setConfirmation({ ...confirmation, open: false });
  }

  function confirm() {
    if (!confirmation?.open || isWritePendingNow()) {
      return;
    }

    const { target } = confirmation;
    notifications.clear();
    setError(null);

    function handleDeleted(message: string) {
      notifications.show({ severity: "success", message });
      setConfirmation(
        (current) => current && { ...current, open: false, trigger: null },
      );
    }

    function handleError(failure: Error) {
      setError(
        isRequestTimeout(failure)
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
        onError: handleError,
      });
    } else {
      deleteAllRobots.mutate(undefined, {
        onSuccess: () => handleDeleted("All robots deleted."),
        onError: handleError,
      });
    }
  }

  function returnFocus() {
    const trigger = confirmation?.trigger;
    if (trigger?.isConnected && !trigger.disabled) {
      trigger.focus();
    } else {
      focusFallback();
    }

    setConfirmation(null);
  }

  const dialog: ComponentProps<typeof DeleteRobotDialog> | null = confirmation
    ? {
        robotName:
          confirmation.target.kind === "robot"
            ? confirmation.target.name
            : undefined,
        open: confirmation.open,
        pending: deleteRobot.isPending || deleteAllRobots.isPending,
        error: error ?? undefined,
        onClearError: () => setError(null),
        onCancel: cancel,
        onConfirm: confirm,
        onExited: returnFocus,
      }
    : null;

  return { requestDelete, dialog };
}
