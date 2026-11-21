import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { render } from "@/query/test-utils";

import Skills from "@/features/skills/skills";
import Integrations from "@/features/integrations/integrations";

test.each([
  [Skills, "Skills", "Skills management is coming soon."],
  [Integrations, "Integrations", "Integration management is coming soon."],
] as const)(
  "%s presents its section and work-in-progress message",
  (Page, title, message) => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Work in progress" }),
    ).toBeVisible();
    expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByAltText("")).toHaveAttribute("alt", "");
  },
);
