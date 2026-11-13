import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import AppThemeProvider from "./theme-provider";
import ThemeToggle from "./theme-toggle";

function matchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

beforeEach(() => {
  // The app starts on the system theme. Pin that preference so the first class is light.
  vi.stubGlobal("matchMedia", matchMedia);
});

afterEach(() => {
  document.documentElement.classList.remove("light", "dark");
  vi.unstubAllGlobals();
});

test("theme switch toggles the light and dark class on the document", () => {
  render(
    <AppThemeProvider>
      <ThemeToggle />
    </AppThemeProvider>,
  );

  const root = document.documentElement;
  const toDark = screen.getByRole("button", { name: "Switch to dark theme" });
  expect(toDark).toBeEnabled();
  expect(root).toHaveClass("light");
  expect(root).not.toHaveClass("dark");

  fireEvent.click(toDark);

  const toLight = screen.getByRole("button", { name: "Switch to light theme" });
  expect(toLight).toBeEnabled();
  expect(root).toHaveClass("dark");
  expect(root).not.toHaveClass("light");

  fireEvent.click(toLight);

  expect(
    screen.getByRole("button", { name: "Switch to dark theme" }),
  ).toBeEnabled();
  expect(root).toHaveClass("light");
  expect(root).not.toHaveClass("dark");
});
