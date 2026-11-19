import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useSyncExternalStore } from "react";
import { afterEach, vi } from "vitest";

// Next's router re-renders useSearchParams readers after history.replaceState.
// Tests run without that router, so a wrapped replaceState signals the change.
const urlChange = "test:url-change";
const replaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = (...args) => {
  replaceState(...args);
  window.dispatchEvent(new Event(urlChange));
};

function subscribe(onChange: () => void) {
  window.addEventListener(urlChange, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(urlChange, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () =>
    new URLSearchParams(
      // The string is the snapshot: a new URLSearchParams each read would never settle.
      useSyncExternalStore(subscribe, () => window.location.search),
    ),
}));

// Globals are off, so Testing Library does not see a global afterEach.
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});
