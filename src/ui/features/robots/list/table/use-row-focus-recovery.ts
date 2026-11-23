import { useLayoutEffect, useRef, type FocusEvent } from "react";

/** Reports when a live update removes the row that held keyboard focus. */
export default function useRowFocusRecovery(onFocusedRowRemoved: () => void) {
  // Focus events from the portalled menu follow the React tree to its row.
  const focusedRow = useRef<HTMLTableRowElement | null>(null);

  useLayoutEffect(() => {
    const row = focusedRow.current;
    if (!row || row.isConnected) {
      return;
    }

    focusedRow.current = null;

    // Avoid stealing focus if another control has already received it.
    if (row.ownerDocument.activeElement === row.ownerDocument.body) {
      onFocusedRowRemoved();
    }
  });

  function handleRowFocus(event: FocusEvent<HTMLTableRowElement>) {
    focusedRow.current = event.currentTarget;
  }

  function handleTableBlur(event: FocusEvent<HTMLElement>) {
    if (
      event.relatedTarget instanceof HTMLElement &&
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      focusedRow.current = null;
    }
  }

  return { handleRowFocus, handleTableBlur };
}
