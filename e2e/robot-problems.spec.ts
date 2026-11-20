import { expect } from "@playwright/test";
import type { Robot } from "@/modules/robots/robot";
import { test } from "./fixtures";

test("investigates a reported problem and retries it from robot details", async ({
  page,
  request,
}) => {
  const created = await request.post("/api/robots", {
    data: {
      name: "Problem demo",
      site: "Munich",
      manufacturer: "Maker",
      type: "inspection",
      integrationType: "ros2",
    },
  });
  expect(created.status()).toBe(201);
  const robot = (await created.json()) as Robot;

  async function report(recovered: boolean) {
    const response = await request.post("/api/telemetry/batch", {
      data: {
        reports: [
          {
            robotId: robot.id,
            activity: recovered ? "working" : "needs-attention",
            problemCode: recovered ? null : "sensor-obstructed",
            batteryPercent: 61,
            area: "Lobby",
            observedAt: new Date().toISOString(),
            appliedControlRevision: recovered ? 1 : 0,
          },
        ],
      },
    });
    expect(response.status()).toBe(200);
  }

  await report(false);
  await page.goto("/robots");
  await page.getByRole("button", { name: /Needs attention$/ }).click();

  const row = page.getByTestId(`robot-row-${robot.id}`);
  await expect(row).toContainText("Sensor obstructed");
  await row.getByRole("link", { name: robot.name, exact: true }).click();
  await expect(page).toHaveURL(`/robots/${robot.id}`);

  const details = page.getByTestId("robot-details");
  const alert = details.getByRole("alert");
  await expect(alert).toContainText(
    "Clear the sensor obstruction before retrying activity.",
  );
  const retry = page.getByRole("button", {
    name: "Retry activity",
    exact: true,
  });
  await expect(retry).toHaveAttribute("aria-disabled", "false");

  await retry.click();
  await expect(page.getByRole("status")).toContainText(
    "Retry activity requested for",
  );

  await report(true);
  await expect(details.getByTestId("robot-activity")).toHaveText("Working", {
    timeout: 15000,
  });
  await expect(alert).toHaveCount(0);

  // Back returns to the filtered view the URL kept.
  await page.goBack();
  await expect(
    page.getByRole("button", {
      name: /Needs attention$/,
      pressed: true,
    }),
  ).toBeVisible();
  await expect(row).toHaveCount(0);
  await expect(page.getByText("No robots match these filters.")).toBeVisible();

  // The breadcrumb is a plain link to the whole fleet.
  await page.goForward();
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Robots", exact: true })
    .click();
  await expect(page).toHaveURL("/robots");
  await expect(
    page.getByRole("button", {
      name: /All robots$/,
      pressed: true,
    }),
  ).toBeVisible();
  await expect(row).toBeVisible();
});
