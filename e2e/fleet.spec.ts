import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { Robot } from "@/modules/robots/robot";
import type { TelemetryReport } from "@/modules/telemetry/telemetry";
import { test } from "./fixtures";

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
  const secondary = label === "Manufacturer" || label === "Integration";
  if (secondary) await page.getByTestId("fleet-more-filters").click();

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
  const matching = {
    name: "Matching robot",
    manufacturer: "Boston Dynamics",
    type: "inspection",
    integrationType: "ros2",
    site: "Munich",
  };
  const created = await request.post("/api/robots/batch", {
    data: {
      robots: [
        matching,
        { ...matching, name: "Other location", site: "Berlin" },
        { ...matching, name: "Other manufacturer", manufacturer: "LG" },
        { ...matching, name: "Other integration", integrationType: "vda5050" },
        { ...matching, name: "Other type", type: "delivery" },
        { ...matching, name: "Healthy robot" },
      ],
    },
  });
  expect(created.status()).toBe(201);
  const { items } = (await created.json()) as { items: Robot[] };
  const robot = items[0];

  async function reportFleet() {
    const telemetry = await request.post("/api/telemetry/batch", {
      data: {
        reports: items.map((record, index) => ({
          robotId: record.id,
          activity: index === 5 ? "working" : "needs-attention",
          problemCode: index === 5 ? null : "path-blocked",
          batteryPercent: 80,
          area: "Lobby",
          observedAt: new Date().toISOString(),
          appliedControlRevision: 0,
        })),
      },
    });
    expect(telemetry.status()).toBe(204);
  }

  await reportFleet();
  await page.goto("/");
  const rows = page.getByTestId("fleet-table").locator("tbody tr");
  await expect(rows).toHaveCount(6);

  await chooseFilter(page, "Location", "Munich");
  await expect(rows).toHaveCount(5);
  await chooseFilter(page, "Manufacturer", "Boston Dynamics");
  await expect(rows).toHaveCount(4);
  await chooseFilter(page, "Integration", "ROS 2");
  await expect(rows).toHaveCount(3);
  await chooseFilter(page, "Type", "Inspection robot");
  await expect(rows).toHaveCount(2);

  await reportFleet();
  await page
    .getByRole("button", { name: "Needs attention", exact: true })
    .click();
  await expect(page.getByTestId(`robot-row-${robot.id}`)).toBeVisible();
  await expect(rows).toHaveCount(1);
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
  await expect(rows).toHaveCount(6);
});

for (const filter of ["Location", "Manufacturer"] as const) {
  test(`${filter} keeps keyboard focus when a poll removes the focused option`, async ({
    page,
    request,
  }) => {
    const created = await request.post("/api/robots/batch", {
      data: {
        robots: ["Atlas", "Bishop"].map((name) => ({
          name,
          manufacturer: name,
          site: name,
          type: "inspection",
          integrationType: "ros2",
        })),
      },
    });
    expect(created.status()).toBe(201);
    const { items } = (await created.json()) as { items: Robot[] };
    const [atlas] = items;

    await page.goto("/");
    if (filter === "Manufacturer")
      await page.getByRole("button", { name: "More filters" }).click();

    const select = page.getByRole("combobox", { name: filter });
    await select.click();
    await page.keyboard.press("ArrowDown");
    const listbox = page.getByRole("listbox");
    const atlasOption = listbox.getByRole("option", {
      name: "Atlas",
      exact: true,
    });
    const bishopOption = listbox.getByRole("option", {
      name: "Bishop",
      exact: true,
    });
    await expect(atlasOption).toBeFocused();

    const response = await request.delete(`/api/robots/${atlas.id}`);
    expect(response.status()).toBe(204);
    await expect(page.getByTestId(`robot-row-${atlas.id}`)).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(atlasOption).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(bishopOption).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(listbox).toBeHidden();
    await select.click();
    await expect(listbox).toBeVisible();
    await expect(atlasOption).toHaveCount(0);
    await bishopOption.click();
    await expect(
      page.getByText(`${filter}: Bishop`, { exact: true }),
    ).toBeVisible();
  });
}

test("live filtered recovery closes the action menu and restores focus", async ({
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
  await expect(page.getByRole("menu")).toBeVisible();

  await sendProblem(request, robot, false);
  await expect(row).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByTestId("fleet-heading")).toBeFocused();
  await expect(
    page.getByRole("button", {
      name: "Needs attention",
      exact: true,
      pressed: true,
    }),
  ).toContainText("0");
});

test("delete confirmation keeps the selected robot after it leaves the filtered results", async ({
  page,
  request,
}) => {
  const [robot, otherRobot] = await seedFleet(request, 2);
  await sendProblem(request, robot, true);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Needs attention", exact: true })
    .click();

  const row = page.getByTestId(`robot-row-${robot.id}`);
  await row.getByRole("button", { name: `Actions for ${robot.name}` }).click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Delete robot?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await sendProblem(request, robot, false);
  await expect(row).toHaveCount(0, { timeout: 15000 });
  await expect(dialog).toContainText(`Delete “${robot.name}”?`);
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();

  const deletion = page.waitForResponse(
    (response) => response.request().method() === "DELETE",
  );
  await dialog.getByRole("button", { name: "Delete" }).click();
  const deleted = await deletion;
  expect(new URL(deleted.url()).pathname).toBe(`/api/robots/${robot.id}`);
  expect(deleted.status()).toBe(204);
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("fleet-heading")).toBeFocused();
  await expect(await request.get(`/api/robots/${otherRobot.id}`)).toBeOK();
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
  await expect(
    page.getByText("No robots match “no-such-robot”."),
  ).toBeVisible();

  await page.getByTestId("fleet-chip-search").focus();
  await page.keyboard.press("Delete");
  await expect(search).toHaveValue("");
  await expect(page.getByTestId(`robot-row-${robots[0].id}`)).toBeVisible();
  await expect(page.getByTestId("fleet-chip-site")).toBeVisible();
  await expect(page.locator("tbody mark")).toHaveCount(0);

  await search.fill("no-such-robot");
  await expect(
    page.getByText("No robots match “no-such-robot”."),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .last()
    .click();
  await expect(search).toHaveValue("");
  await expect(page.getByTestId(`robot-row-${robots[1].id}`)).toBeVisible();

  await page.setViewportSize({ width: 650, height: 900 });
  await expect(search).toBeVisible();
  await page.getByTestId("fleet-more-filters").click();
  await expect(
    page.getByRole("combobox", { name: "Integration", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close more filters" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
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

test("search debounce closes an unmounted action menu and the new view keeps polling", async ({
  page,
  request,
}) => {
  const [robot] = await seedFleet(request, 1);
  await page.clock.install();
  await page.goto("/");
  const row = page.getByTestId(`robot-row-${robot.id}`);
  await expect(row).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  let requests = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/robots" && url.searchParams.has("search"))
      requests++;
  });
  await page.getByRole("textbox", { name: "Search robots" }).fill(robot.name);
  await row.getByTestId("robot-actions").click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.clock.runFor(1000);
  await page.clock.resume();
  await expect(page.getByTestId("fleet-chip-search")).toContainText(robot.name);
  await expect(row).toBeVisible();
  await expect(page.getByRole("menu")).toHaveCount(0);
  const previous = requests;
  expect(previous).toBeGreaterThan(0);
  await expect
    .poll(() => requests, { timeout: 10000 })
    .toBeGreaterThan(previous);
});
