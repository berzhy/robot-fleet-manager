import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Globals are off, so Testing Library does not see a global afterEach.
afterEach(() => {
  cleanup();
});
