import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { render } from "@/ui/test-render";

import SearchHighlight from "./search-highlight";

test("highlights every literal match regardless of case, preserving the text", () => {
  const { container } = render(
    <SearchHighlight text="ROS 2 / ros 2" search="ros 2" />,
  );
  expect(container.textContent).toBe("ROS 2 / ros 2");
  expect(
    [...container.querySelectorAll("mark")].map((mark) => mark.textContent),
  ).toEqual(["ROS 2", "ros 2"]);
});

test("preserves highlight offsets after characters that expand when lowercased", () => {
  const { container } = render(<SearchHighlight text="İdea" search="de" />);

  expect(screen.getByText("de", { selector: "mark" })).toBeVisible();
  expect(container.textContent).toBe("İdea");
});

test("treats regex and HTML characters as plain text", () => {
  const { container } = render(
    <SearchHighlight text="<robot>.*%_" search=".*%_" />,
  );
  expect(screen.getByText(".*%_", { selector: "mark" })).toBeVisible();
  expect(container.textContent).toBe("<robot>.*%_");
  expect(container.querySelector("robot")).toBeNull();
});

test("leaves unmatched text and cleared searches unchanged", () => {
  const { container, rerender } = render(
    <SearchHighlight text="Boston Dynamics" search="Munich" />,
  );
  expect(container.querySelector("mark")).toBeNull();
  rerender(<SearchHighlight text="Boston Dynamics" />);
  expect(container.textContent).toBe("Boston Dynamics");
  expect(container.querySelector("mark")).toBeNull();
});
