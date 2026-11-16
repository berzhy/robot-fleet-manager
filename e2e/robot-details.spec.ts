import { expect, test } from "@playwright/test";
import type { Robot } from "@/modules/robots/robot";

test.use({ locale: "de-DE", timezoneId: "America/New_York" });

test("detail context and controls follow reported telemetry", async ({
  page,
  request,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const suffix = Date.now();
  const site = `Detail demo ${suffix}`;
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
          index === 3
            ? `Detail ${index} inspection robot assigned to the northern warehouse service corridor`
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
    expect(response.status()).toBe(204);
  }
  await report("working", 0);
  await page.goto(`/robots/${selected.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: selected.name }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Location" })).toContainText(
    "Lobby: 3 other robots",
  );
  await expect(
    page.getByRole("button", { name: "Stop activity", exact: true }),
  ).toHaveAttribute("aria-disabled", "false");
  let releaseAction!: () => void;
  const actionGate = new Promise<void>((resolve) => (releaseAction = resolve));
  await page.route(`**/api/robots/${selected.id}/actions`, async (route) => {
    await actionGate;
    await route.continue();
  });
  const location = page.getByRole("region", { name: "Location" });
  async function mapOffset() {
    const map = await location.boundingBox();
    const details = await page.getByTestId("robot-details").boundingBox();
    return map!.y - details!.y;
  }
  const beforeAction = await mapOffset();
  const batteryBeforeAction = await page
    .getByTestId("robot-battery")
    .boundingBox();
  await page
    .getByRole("button", { name: "Stop activity", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Activity controls" }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(page.getByTestId("robot-connection")).toHaveText("Online");
  expect(await mapOffset()).toBe(beforeAction);
  releaseAction();
  await expect(page.getByRole("status")).toContainText(
    "Stop activity requested.",
  );
  expect(await mapOffset()).toBe(beforeAction);
  await expect(page.getByRole("status")).toBeHidden({ timeout: 10000 });
  expect(await mapOffset()).toBe(beforeAction);
  await report("idle", 1);
  await expect(page.getByTestId("robot-activity")).toHaveText("Idle", {
    timeout: 15000,
  });
  const batteryAfterAction = await page
    .getByTestId("robot-battery")
    .boundingBox();
  expect(batteryAfterAction!.x).toBe(batteryBeforeAction!.x);
  const overviewTab = page.getByRole("tab", { name: "Overview" });
  const logsTab = page.getByRole("tab", { name: "Logs" });
  await overviewTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(logsTab).toBeFocused();
  await page.keyboard.press("Enter");
  const logs = page.getByRole("tabpanel", { name: "Logs" });
  await expect(logs).toContainText(`Initializing ${selected.name}`);
  await expect(
    page.getByRole("group", { name: "Activity controls" }),
  ).toBeVisible();
  await expect(location).toBeHidden();
  await page.screenshot({
    path: testInfo.outputPath("robot-logs-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(location).toBeVisible();
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    const main = document.querySelector("main")!;
    main.style.overflow = "visible";
    main.parentElement!.style.height = "auto";
  });
  await page.screenshot({
    path: testInfo.outputPath("robot-details-desktop.png"),
    fullPage: true,
  });
  for (const robot of records) {
    await page.goto(`/robots/${robot.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: robot.name }),
    ).toBeVisible();
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      main.style.overflow = "visible";
      main.parentElement!.style.height = "auto";
    });
    await page
      .locator("main img")
      .evaluateAll((images) =>
        Promise.all(
          images.map((image) => (image as HTMLImageElement).decode()),
        ),
      );
    await page.screenshot({
      path: testInfo.outputPath(`robot-details-${robot.type}.png`),
      fullPage: true,
    });
    await expect(
      page.getByRole("region", { name: "Robot information" }).locator("img"),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: testInfo.outputPath("robot-details-dark.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("robot-details-mobile.png"),
    fullPage: true,
  });
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
  await page.screenshot({
    path: testInfo.outputPath("robot-logs-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(browserErrors).toEqual([]);
  for (const robot of records) await request.delete(`/api/robots/${robot.id}`);
});
