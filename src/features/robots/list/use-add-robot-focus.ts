import { useEffect, useRef, type RefObject } from "react";

import type { RobotListStatus } from "./use-robot-list";

export default function useAddRobotFocus({
  inFlightRef,
  adding,
  deleteDialogActive,
  status,
}: {
  inFlightRef: RefObject<boolean>;
  adding: boolean;
  deleteDialogActive: boolean;
  status: RobotListStatus;
}) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const target = focusTargetRef.current;
    if (
      !target ||
      inFlightRef.current ||
      adding ||
      deleteDialogActive ||
      status === "loading"
    ) {
      return;
    }

    // A list refresh can remove the recorded trigger before focus returns.
    focusTargetRef.current = null;
    (target.isConnected ? target : addButtonRef.current)?.focus();
  }, [inFlightRef, adding, deleteDialogActive, status]);

  function rememberAddTrigger(trigger: HTMLButtonElement) {
    focusTargetRef.current = trigger;
  }

  function preferAddButton() {
    focusTargetRef.current = addButtonRef.current;
  }

  return { addButtonRef, rememberAddTrigger, preferAddButton };
}
