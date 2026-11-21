import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useSyncExternalStore } from "react";
import { afterEach, vi } from "vitest";

// Stands in for Next's router: useSearchParams keeps the URL it last heard
// about, and hears of a replaceState through an event, as Next applies it in a
// later transition. A test can hold that event to reproduce the gap.
const urlChange = "test:url-change";
let routerSearch = window.location.search;

const replaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = (...args) => {
  replaceState(...args);
  window.dispatchEvent(new Event(urlChange));
};

for (const type of [urlChange, "popstate"]) {
  window.addEventListener(type, () => {
    routerSearch = window.location.search;
  });
}

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
      useSyncExternalStore(subscribe, () => routerSearch),
    ),
}));

// Globals are off, so Testing Library does not see a global afterEach.
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  // The theme marks <html> with its scheme, which outlives the rendered tree.
  document.documentElement.classList.remove("light", "dark");
});
