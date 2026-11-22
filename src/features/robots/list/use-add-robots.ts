import { useEffect, useRef } from "react";

import { useNotifications } from "@/shared/notifications/notification-provider";

import { isRequestTimeout } from "../api/robot-api";
import { useCreateRobots, useRobotWriteLocks } from "../api/robot-mutations";

import { generateRobotInput } from "./generate-robot-input";

/** Adds generated robots, reports the outcome, and returns focus once the list settles. */
export default function useAddRobots({
  blocked,
}: {
  /** The list is loading or a dialog is open. */
  blocked: boolean;
}) {
  const createRobots = useCreateRobots();
  const notifications = useNotifications();
  const locks = useRobotWriteLocks();
  const isAddLocked = locks.isAddLocked();

  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<HTMLButtonElement | null>(null);

  // The add buttons are disabled while the write and the refresh run, which
  // drops focus; return it once they are enabled again.
  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target || isAddLocked || blocked) {
      return;
    }

    // A list refresh can remove the recorded trigger before focus returns.
    focusTargetRef.current = null;
    (target.isConnected ? target : addButtonRef.current)?.focus();
  }, [isAddLocked, blocked]);

  function addRobots(trigger: HTMLButtonElement, count: 1 | 10 | 100 = 1) {
    if (locks.isAddLocked() || blocked) {
      return;
    }

    notifications.clear();
    focusTargetRef.current = trigger;

    // The promise settles even after the list unmounts, unlike per-call mutate
    // callbacks, so the outcome is still reported after navigating away.
    createRobots
      .mutateAsync(Array.from({ length: count }, () => generateRobotInput()))
      .then(
        (robots) => {
          notifications.show({
            severity: "success",
            message:
              count === 1
                ? `“${robots[0].name}” added.`
                : `${robots.length} robots added.`,
          });
          // The list changes, so focus goes to the main add button rather than
          // the menu item or empty-state button that started it.
          focusTargetRef.current = addButtonRef.current;
        },
        (error: Error) => {
          notifications.show({
            severity: "error",
            message: isRequestTimeout(error)
              ? "The add request timed out, so its outcome is uncertain. The list shows the latest fleet state; check it before you try again."
              : count === 1
                ? "Unable to add robot. Please try again."
                : "Unable to add robots. Please try again.",
          });
        },
      );
  }

  return {
    addRobots,
    adding: createRobots.isPending,
    isAddLocked,
    addButtonRef,
  };
}
