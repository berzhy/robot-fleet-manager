import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import AppThemeProvider from "./theme-provider";
import ThemeToggle from "./theme-toggle";

function matchMedia(query: string): MediaQueryList {
  return {
    matches: query === "(prefers-color-scheme: dark)",
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
  vi.stubGlobal("matchMedia", matchMedia);
});

afterEach(() => {
  document.documentElement.classList.remove("light", "dark");
  vi.unstubAllGlobals();
});

test("defaults to light despite dark system preference and toggles both themes", () => {
  render(
    <AppThemeProvider>
      <ThemeToggle />
    </AppThemeProvider>,
  );

  const root = document.documentElement;
  const toDark = screen.getByTestId("theme-toggle");
  expect(toDark).toHaveRole("button");
  expect(toDark).toBeEnabled();
  expect(toDark).toHaveAccessibleName("Switch to dark theme");
  expect(root).toHaveClass("light");
  expect(root).not.toHaveClass("dark");

  fireEvent.click(toDark);

  const toLight = screen.getByTestId("theme-toggle");
  expect(toLight).toBeEnabled();
  expect(toLight).toHaveAccessibleName("Switch to light theme");
  expect(root).toHaveClass("dark");
  expect(root).not.toHaveClass("light");

  fireEvent.click(toLight);

  expect(screen.getByTestId("theme-toggle")).toBeEnabled();
  expect(screen.getByTestId("theme-toggle")).toHaveAccessibleName(
    "Switch to dark theme",
  );
  expect(root).toHaveClass("light");
  expect(root).not.toHaveClass("dark");
});
