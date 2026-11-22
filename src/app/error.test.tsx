import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { render } from "@/test/render";

import ErrorPage from "./error";

test("a failed page explains itself and retries on request", () => {
  const retry = vi.fn();
  render(<ErrorPage retry={retry} />);

  expect(
    screen.getByRole("heading", { name: "Something went wrong", level: 1 }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(retry).toHaveBeenCalledOnce();
});
