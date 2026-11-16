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
    page.getByRole("menuitem", { name: "Start activity" }),
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

async function seedFleet(request: APIRequestContext, count = 1) {
  const response = await request.post("/api/robots/batch", {
    data: {
      robots: Array.from({ length: count }, (_, index) => ({
        name: `Filter robot ${index}`,
        manufacturer: "Boston Dynamics",
        type: "inspection",
        integrationType: "ros2",
        site: "Munich",
      })),
    },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { items: Robot[] }).items;
}
async function chooseFilter(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
async function sendProblem(
  request: APIRequestContext,
  robot: Robot,
  problem: boolean,
) {
  const response = await request.post("/api/telemetry/batch", {
    data: {
      reports: [
        {
          robotId: robot.id,
          activity: problem ? "needs-attention" : "working",
          problemCode: problem ? "path-blocked" : null,
          appliedControlRevision: 0,
          batteryPercent: 80,
          area: "Lobby",
          observedAt: new Date().toISOString(),
        },
      ],
    },
  });
  expect(response.status()).toBe(204);
}

test("combines dropdowns and tiles, removes chips and retries a failed filter request", async ({
  page,
  request,
}) => {
  const [robot] = await seedFleet(request);
  await sendProblem(request, robot, true);
  await page.goto("/");
  await chooseFilter(page, "Location", "Munich");
  await chooseFilter(page, "Manufacturer", "Boston Dynamics");
  await chooseFilter(page, "Integration", "ROS 2");
  await chooseFilter(page, "Type", "Inspection robot");
  await page
    .getByRole("button", { name: "Needs attention", exact: true })
    .click();
  await expect(page.getByTestId(`robot-row-${robot.id}`)).toBeVisible();
  await expect(
    page.getByText("Location: Munich", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Type: Inspection robot", { exact: true }),
  ).toBeVisible();
  const removable = page.getByTestId("fleet-chip-view");
  await removable.focus();
  await page.keyboard.press("Delete");
  await expect(
    page.getByRole("button", { name: "All robots", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Integration: ROS 2", { exact: true }),
  ).toBeVisible();
  let fail = true;
  await page.route("**/api/robots?*", (route) =>
    fail ? route.fulfill({ status: 500, body: "error" }) : route.continue(),
  );
  await page.getByRole("button", { name: "Low battery", exact: true }).click();
  await expect(page.getByTestId("fleet-load-error")).toBeVisible();
  fail = false;
  await page.getByTestId("fleet-retry").click();
  await expect(page.getByText("No robots match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(page.getByTestId(`robot-row-${robot.id}`)).toBeVisible();
  fail = true;
  await expect(page.getByTestId("fleet-refresh-warning")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId(`robot-row-${robot.id}`)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "All robots", exact: true }),
  ).toContainText("1");
  fail = false;
  await expect(page.getByTestId("fleet-refresh-warning")).toHaveCount(0, {
    timeout: 15000,
  });
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(
    page.getByRole("combobox", { name: "Integration", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/fleet-filters-narrow.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/fleet-filters-dark.png" });
});

test("live filtered recovery pauses for menus and restores focus when the row leaves", async ({
  page,
  request,
}) => {
  const [robot] = await seedFleet(request);
  await sendProblem(request, robot, true);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Needs attention", exact: true })
    .click();
  const row = page.getByTestId(`robot-row-${robot.id}`);
  await expect(row).toBeVisible();
  await row.getByTestId("robot-actions").click();
  await sendProblem(request, robot, false);
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(row).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(row).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByTestId("fleet-heading")).toBeFocused();
  await expect(
    page.getByRole("button", {
      name: "Needs attention",
      exact: true,
      pressed: true,
    }),
  ).toContainText("0");
});

test("deleting the last filtered page corrects pagination and retains filters", async ({
  page,
  request,
}) => {
  await seedFleet(request, 11);
  await page.goto("/");
  await chooseFilter(page, "Location", "Munich");
  await page.getByTestId("fleet-next-page").click();
  await expect(page.getByTestId("fleet-page-summary")).toHaveText(
    "11–11 of 11",
  );
  const row = page.getByTestId("fleet-table").locator("tbody tr");
  await row.getByTestId("robot-actions").click();
  await page.getByTestId("robot-delete").click();
  await page.getByTestId("delete-robot-confirm").click();
  await expect(page.getByTestId("fleet-page-summary")).toHaveText("1–10 of 10");
  await expect(
    page.getByText("Location: Munich", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("fleet-notification")).toContainText("deleted");
});

test("search combines with filters and tiles, clears through chips and recovers from no matches", async ({
  page,
  request,
}) => {
  const robots = await seedFleet(request, 2);
  await sendProblem(request, robots[0], true);
  await page.goto("/");
  await chooseFilter(page, "Location", "Munich");
  await page
    .getByRole("button", { name: "Needs attention", exact: true })
    .click();
  const search = page.getByRole("textbox", { name: "Search robots" });
  await search.fill("ROS 2");
  await expect(page.getByTestId("fleet-chip-search")).toHaveText(
    "Search: ROS 2",
  );
  await expect(page.getByTestId(`robot-row-${robots[0].id}`)).toBeVisible();
  await expect(page.getByTestId(`robot-row-${robots[1].id}`)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "All robots", exact: true }),
  ).toContainText("2");
  await expect(page.getByTestId("fleet-loading")).toHaveText("1 robot found.");
  await expect(
    page
      .getByTestId(`robot-row-${robots[0].id}`)
      .getByTestId("robot-integration")
      .locator("mark"),
  ).toHaveText("ROS 2");
  await expect(search).toBeFocused();
  await search.fill("no-such-robot");
  await expect(page.getByText("No robots match these filters.")).toBeVisible();
  await page.getByTestId("fleet-chip-search").focus();
  await page.keyboard.press("Delete");
  await expect(search).toHaveValue("");
  await expect(page.getByTestId(`robot-row-${robots[0].id}`)).toBeVisible();
  await expect(page.getByTestId("fleet-chip-site")).toBeVisible();
  await expect(page.locator("tbody mark")).toHaveCount(0);
  await search.fill("no-such-robot");
  await expect(page.getByText("No robots match these filters.")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .last()
    .click();
  await expect(search).toHaveValue("");
  await expect(page.getByTestId(`robot-row-${robots[1].id}`)).toBeVisible();
  await page.setViewportSize({ width: 650, height: 900 });
  await expect(search).toBeVisible();
  await page.screenshot({ path: "/tmp/fleet-search-narrow.png" });
});

test("delete all clears robots outside the active search and allows adding again", async ({
  page,
  request,
}) => {
  const records = [];
  for (const name of ["Bulk visible", "Hidden robot"]) {
    const response = await request.post("/api/robots", {
      data: {
        name,
        site: "Munich",
        manufacturer: "Maker",
        type: "inspection",
        integrationType: "ros2",
      },
    });
    expect(response.status()).toBe(201);
    records.push((await response.json()) as Robot);
  }
  await page.goto("/");
  await expect(page.getByTestId(`robot-row-${records[1].id}`)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search robots" })
    .fill("Bulk visible");
  await expect(page.getByTestId(`robot-row-${records[1].id}`)).toBeHidden();
  await page.getByTestId("fleet-add-options").click();
  await page.getByRole("menuitem", { name: "Delete all robots" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete all robots?" });
  await expect(dialog).toContainText("including those hidden by filters");
  await dialog.getByRole("button", { name: "Delete all robots" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("fleet-notification")).toContainText(
    "All robots deleted.",
  );
  await expect(page.getByTestId("fleet-empty")).toBeVisible();
  expect(await registeredRobots(request)).toHaveLength(0);
  await page.getByRole("textbox", { name: "Search robots" }).fill("");
  await expect(
    page.getByRole("textbox", { name: "Search robots" }),
  ).toHaveValue("");
  await addRobot(page);
  expect(await registeredRobots(request)).toHaveLength(1);
});
