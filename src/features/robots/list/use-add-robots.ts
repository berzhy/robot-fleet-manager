import { useEffect, useRef } from "react";

import { useNotifications } from "@/shared/notifications/notification-provider";

import { isRequestTimeout } from "../api/robot-api";
import { useCreateRobots, useRobotWriteLock } from "../api/robot-mutations";

import { generateRobotInput } from "./generate-robot-input";
import useRobotList from "./use-robot-list";

/** Adds generated robots, reports the outcome, and returns focus once the list settles. */
export default function useAddRobots({ blocked }: { blocked: boolean }) {
  const createRobots = useCreateRobots();
  const notifications = useNotifications();
  const { isWritePending, isWritePendingNow } = useRobotWriteLock();
  const { status } = useRobotList();

  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<HTMLButtonElement | null>(null);

  // The add buttons are disabled while the write and the refresh run, which
  // drops focus; return it once they are enabled again.
  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target || isWritePending || blocked || status === "loading") {
      return;
    }

    // A list refresh can remove the recorded trigger before focus returns.
    focusTargetRef.current = null;
    (target.isConnected ? target : addButtonRef.current)?.focus();
  }, [isWritePending, blocked, status]);

  function addRobots(trigger: HTMLButtonElement, count: 1 | 10 | 100 = 1) {
    if (isWritePendingNow() || blocked || status === "loading") {
      return;
    }

    notifications.clear();
    focusTargetRef.current = trigger;

    createRobots.mutate(
      Array.from({ length: count }, () => generateRobotInput()),
      {
        onSuccess: (robots) => {
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
        onError: (error) => {
          notifications.show({
            severity: "error",
            message: isRequestTimeout(error)
              ? "The add request timed out, so its outcome is uncertain. The list shows the latest fleet state; check it before you try again."
              : count === 1
                ? "Unable to add robot. Please try again."
                : "Unable to add robots. Please try again.",
          });
        },
      },
    );
  }

  return { addRobots, adding: createRobots.isPending, addButtonRef };
}
