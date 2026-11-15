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
  await expect(page.getByTestId("fleet-empty")).toBeVisible();

  const first = await addRobot(page);
  const second = await addRobot(page);
  expect(second.id).not.toBe(first.id);

  const firstRow = page.getByTestId(`robot-row-${first.id}`);
  const secondRow = page.getByTestId(`robot-row-${second.id}`);
  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();
  expect(await registeredRobots(request)).toHaveLength(2);
  const reports: TelemetryReport[] = [first, second].map(({ id }) => ({
    robotId: id,
    activity: "working",
    problemCode: null,
    appliedControlRevision: 0,
    batteryPercent: 80,
    area: "Loading bay",
    observedAt: new Date().toISOString(),
  }));
  const telemetry = await request.post("/api/telemetry/batch", {
    data: { reports },
  });
  expect(telemetry.status()).toBe(204);

  for (const row of [firstRow, secondRow]) {
    await expect(row.getByTestId("robot-connection")).toHaveText("Online", {
      timeout: 20_000,
    });
    await expect(row.getByTestId("robot-activity")).toHaveText("Working", {
      timeout: 15000,
    });
    await expect(row.getByTestId("robot-battery")).toHaveText("80%");
    await expect(row.getByTestId("robot-area")).toHaveText("Loading bay");
  }

  await firstRow.getByTestId("robot-actions").click();
  await page.getByTestId("robot-delete").click();
  await page
    .getByTestId("delete-robot-dialog")
    .getByTestId("delete-robot-confirm")
    .click();

  await expect(page.getByTestId("fleet-notification")).toContainText(
    `“${first.name}” deleted.`,
  );
  await expect(firstRow).toHaveCount(0);
  await expect(secondRow).toBeVisible();
});

async function registeredRobots(request: APIRequestContext) {
  const response = await request.get("/api/robots/registry");
  await expect(response).toBeOK();
  const { items } = (await response.json()) as { items: Robot[] };
  return items;
}

async function addRobot(page: Page): Promise<Robot> {
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/robots" &&
      response.request().method() === "POST",
  );
  await page.getByTestId("fleet-add-robot").click();
  const response = await created;
  expect(response.status()).toBe(201);
  const robot = (await response.json()) as Robot;
  const row = page.getByTestId(`robot-row-${robot.id}`);
  await expect(row).toBeVisible();
  await expect(row.getByTestId("robot-name")).toHaveText(robot.name);
  await expect(page.getByTestId("fleet-notification")).toContainText(
    `“${robot.name}” added.`,
  );
  return robot;
}

test("keyboard explanations and Stop/Retry requests follow reported activity", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const robot = await addRobot(page);
  const row = page.getByTestId(`robot-row-${robot.id}`);
  async function report(activity: Robot["activity"], revision: number) {
    const response = await request.post("/api/telemetry/batch", {
      data: {
        reports: [
          {
            robotId: robot.id,
            activity,
            problemCode: activity === "needs-attention" ? "path-blocked" : null,
            appliedControlRevision: revision,
            batteryPercent: 80,
            area: "Lobby",
            observedAt: new Date().toISOString(),
          },
        ],
      },
    });
    expect(response.status()).toBe(204);
  }
  await report("working", 0);
  await expect(row.getByTestId("robot-activity")).toHaveText("Working", {
    timeout: 15000,
  });
  await row.getByTestId("robot-actions").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("tooltip")).toHaveText(
    "Robot is already working",
  );
  await expect(
    page.getByRole("menuitem", { name: "Start work" }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("menuitem", { name: "Stop activity" }).click();
  await expect(page.getByTestId("fleet-notification")).toContainText(
    "Stop requested",
  );
  const stopped = (await (
    await request.get(`/api/robots/${robot.id}`)
  ).json()) as Robot;
  expect(stopped).toMatchObject({
    activity: "working",
    controlTarget: "stop",
    controlRevision: 1,
  });
  await report("idle", 1);
  await expect(row.getByTestId("robot-activity")).toHaveText("Idle", {
    timeout: 15000,
  });
  await report("needs-attention", 1);
  await expect(row.getByTestId("robot-activity")).toContainText(
    "Path blocked",
    { timeout: 15000 },
  );
  await row.getByTestId("robot-actions").click();
  await page.getByRole("menuitem", { name: "Retry activity" }).click();
  await expect(page.getByTestId("fleet-notification")).toContainText(
    "Retry requested",
  );
  expect(
    await (await request.get(`/api/robots/${robot.id}`)).json(),
  ).toMatchObject({ controlTarget: "work", controlRevision: 2 });
  await report("working", 2);
  await expect(row.getByTestId("robot-activity")).toHaveText("Working", {
    timeout: 15000,
  });
});
