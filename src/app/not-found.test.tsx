import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { render } from "@/ui/test-render";

import PageNotFound from "./not-found";

test("an unknown page links to the robots list", () => {
  render(<PageNotFound />);

  expect(
    screen.getByRole("heading", { name: "Page not found", level: 1 }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Back to robots" })).toHaveAttribute(
    "href",
    "/robots",
  );
});
