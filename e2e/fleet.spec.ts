import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import type { Robot } from "@/modules/robots/robot";
import type { TelemetryReport } from "@/modules/telemetry/telemetry";

test.beforeEach(async ({ request }) => {
  for (const robot of await registeredRobots(request)) {
    const response = await request.delete(`/api/robots/${robot.id}`);
    expect(response.status()).toBe(204);
  }
});

test("adds two robots and deletes one", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("No robots available.")).toBeVisible();

  const add = page
    .getByRole("group", { name: "Add robots" })
    .getByRole("button", { name: "Add robot" });
  await add.click();
  const first = await addedName(page);
  await add.click();
  const second = await addedName(page, first);

  const firstRow = page.getByRole("row", { name: first });
  const secondRow = page.getByRole("row", { name: second });
  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();
  const robots = await registeredRobots(request);
  expect(robots).toHaveLength(2);
  const reports: TelemetryReport[] = robots.map(({ id }) => ({
    robotId: id,
    activity: "working",
    batteryPercent: 80,
    area: "Loading bay",
    observedAt: new Date().toISOString(),
  }));
  const telemetry = await request.post("/api/telemetry/batch", {
    data: { reports },
  });
  expect(telemetry.status()).toBe(204);

  await expect(firstRow.getByText("Online", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(secondRow.getByText("Online", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  for (const row of [firstRow, secondRow]) {
    await expect(row.getByText("Working", { exact: true })).toBeVisible();
    await expect(row.getByText("80%", { exact: true })).toBeVisible();
    await expect(row.getByText("Loading bay", { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: `Actions for ${first}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: "Delete robot?" })
    .getByRole("button", { name: "Delete" })
    .click();

  await expect(page.getByText(`“${first}” deleted.`)).toBeVisible();
  await expect(firstRow).toHaveCount(0);
  await expect(secondRow).toBeVisible();
});

async function registeredRobots(request: APIRequestContext) {
  const response = await request.get("/api/robots/registry");
  await expect(response).toBeOK();
  const { items } = (await response.json()) as { items: Robot[] };
  return items;
}

async function addedName(page: Page, previous?: string) {
  const status = page.getByRole("status").filter({ hasText: "added." });
  let name = "";
  await expect(async () => {
    const text = (await status.textContent()) ?? "";
    const found = text.match(/“([^”]+)” added\./)?.[1] ?? "";
    expect(found).not.toBe("");
    expect(found).not.toBe(previous ?? "");
    name = found;
  }).toPass({ timeout: 15_000 });
  return name;
}
