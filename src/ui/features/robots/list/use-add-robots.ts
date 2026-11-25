import { useEffect, useRef } from "react";

import { useNotifications } from "@/ui/notifications/notification-provider";
import { isRequestTimeout } from "@/ui/utils/api-request";

import { useCreateRobots } from "../api/robot-mutations";

import { generateRobotInput } from "./generate-robot-input";

/** Adds generated robots, reports the outcome, and returns focus once the list settles. */
export default function useAddRobots() {
  const createRobots = useCreateRobots();
  const notifications = useNotifications();

  const addButtonRef = useRef<HTMLButtonElement>(null);
  const isReturningFocus = useRef(false);

  // The add buttons are disabled while the write runs, which drops focus; it
  // goes to the main add button once they are enabled again.
  useEffect(() => {
    if (isReturningFocus.current && !createRobots.isPending) {
      isReturningFocus.current = false;
      addButtonRef.current?.focus();
    }
  }, [createRobots.isPending]);

  function addRobots(count: 1 | 10 | 100 = 1) {
    notifications.clear();
    isReturningFocus.current = true;

    // The promise settles even after the list unmounts, unlike per-call mutate
    // callbacks, so the outcome is still reported after navigating away.
    createRobots
      .mutateAsync(Array.from({ length: count }, () => generateRobotInput()))
      .then(
        (robots) =>
          notifications.show({
            severity: "success",
            message:
              count === 1
                ? `“${robots[0].name}” added.`
                : `${robots.length} robots added.`,
          }),
        (error: Error) =>
          notifications.show({
            severity: "error",
            message: isRequestTimeout(error)
              ? "The add request timed out, so its outcome is uncertain. The list shows the latest fleet state; check it before you try again."
              : count === 1
                ? "Unable to add robot. Please try again."
                : "Unable to add robots. Please try again.",
          }),
      );
  }

  return { addRobots, adding: createRobots.isPending, addButtonRef };
}
