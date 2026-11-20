import { expect } from "@playwright/test";
import { test } from "./fixtures";
import type { Robot } from "@/modules/robots/robot";

test.use({ locale: "de-DE", timezoneId: "America/New_York" });

test("detail context and controls follow reported telemetry", async ({
  page,
  request,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const site = "Detail demo";
  const records: Robot[] = [];
  for (const [index, type] of [
    "cleaning",
    "delivery",
    "security",
    "inspection",
  ].entries()) {
    const response = await request.post("/api/robots", {
      data: {
        name:
          index === 0
            ? "Service robot assigned to the northern warehouse service corridor"
            : `Detail ${index}`,
        site,
        manufacturer: "Demo manufacturer",
        type,
        integrationType: "ros2",
      },
    });
    expect(response.status()).toBe(201);
    records.push((await response.json()) as Robot);
  }
  const selected = records[0];

  async function report(activity: "working" | "idle", revision: number) {
    const response = await request.post("/api/telemetry/batch", {
      data: {
        reports: records.map((robot) => ({
          robotId: robot.id,
          activity,
          area: "Lobby",
          batteryPercent: 76,
          problemCode: null,
          appliedControlRevision: revision,
          observedAt: new Date().toISOString(),
        })),
      },
    });
    expect(response.status()).toBe(200);
  }

  await report("working", 0);
  await page.goto(`/robots/${selected.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: selected.name }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Robots", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Location" })).toContainText(
    "Lobby: 3 other robots",
  );
  await expect(
    page.getByRole("button", { name: "Stop activity", exact: true }),
  ).toHaveAttribute("aria-disabled", "false");
  await expect(
    page.getByRole("button", { name: "Start activity", exact: true }),
  ).toHaveCount(0);

  let releaseAction!: () => void;
  const actionGate = new Promise<void>((resolve) => (releaseAction = resolve));
  await page.route(`**/api/robots/${selected.id}/actions`, async (route) => {
    await actionGate;
    await route.continue();
  });

  const location = page.getByRole("region", { name: "Location" });
  await report("working", 0);
  await page
    .getByRole("button", { name: "Stop activity", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Activity controls" }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("robot-connection")).toHaveText("Online");
  await expect(location).toBeVisible();

  releaseAction();
  await expect(page.getByRole("status")).toContainText(
    "Stop activity requested for",
  );
  await expect(location).toBeVisible();
  await expect(page.getByTestId("robot-activity")).toHaveText("Working");
  await expect(page.getByTestId("robot-battery")).toHaveText("76%");

  await report("idle", 1);
  await expect(page.getByTestId("robot-activity")).toHaveText("Idle", {
    timeout: 15000,
  });
  await expect(
    page.getByRole("button", { name: "Start activity", exact: true }),
  ).toHaveAttribute("aria-disabled", "false");
  await expect(
    page.getByRole("button", { name: "Stop activity", exact: true }),
  ).toHaveCount(0);

  const mapTab = page.getByRole("tab", { name: "Map" });
  const logsTab = page.getByRole("tab", { name: "Logs" });
  await mapTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(logsTab).toBeFocused();
  await page.keyboard.press("Enter");

  const logs = page.getByRole("tabpanel", { name: "Logs" });
  await expect(logs).toContainText(`Initializing ${selected.name}`);
  await expect(
    page.getByRole("group", { name: "Activity controls" }),
  ).toBeVisible();
  await expect(location).toBeHidden();

  await logsTab.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(location).toBeVisible();

  const illustration = page.getByTestId("robot-details").locator("img");
  await expect(illustration).toBeVisible();
  await expect(illustration).toHaveJSProperty("complete", true);
  await expect(illustration).not.toHaveJSProperty("naturalWidth", 0);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await logsTab.click();
  await expect(logs).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("link", { name: "Back to robots" }).click();
  await expect(page).toHaveURL("/robots");
  await expect(page.getByTestId(`robot-row-${selected.id}`)).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("a missing robot links back to the fleet list", async ({ page }) => {
  await page.goto("/robots/missing-robot");
  await expect(
    page.getByRole("heading", { name: "Robot not found" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to robots" }).click();
  await expect(page).toHaveURL("/robots");
  await expect(
    page.getByRole("heading", { level: 1, name: "Robots", exact: true }),
  ).toBeVisible();
});
