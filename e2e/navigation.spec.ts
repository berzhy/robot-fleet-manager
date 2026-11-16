import { expect, test } from "@playwright/test";

test("desktop sections support navigation, history, direct loads and themes", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("link", { name: "Fleet", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeHidden();
  for (const section of ["Skills", "Integrations"]) {
    await navigation.getByRole("link", { name: section, exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: section }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: section, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: "Work in progress", exact: true }),
    ).toBeVisible();
  }
  await page.goBack();
  await expect(
    page.getByRole("heading", { level: 1, name: "Skills" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    navigation.getByRole("link", { name: "Skills", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "/tmp/sidebar-desktop-dark.png" });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.screenshot({ path: "/tmp/sidebar-desktop-light.png" });
  await page.goto("/integrations");
  await expect(
    page.getByRole("heading", { level: 1, name: "Integrations" }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: "Fleet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fleet dashboard" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sidebar-fleet-desktop.png" });
});

test("mobile drawer closes with Escape, backdrop and navigation and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/skills");
  const menu = page.getByRole("button", { name: "Open navigation" });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeHidden();
  await menu.click();
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await page.mouse.click(350, 400);
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await navigation
    .getByRole("link", { name: "Integrations", exact: true })
    .click();
  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: "Integrations" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/sidebar-mobile.png" });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("keyboard skip link targets main content", async ({ page }) => {
  await page.goto("/skills");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("robot details remain within Fleet navigation", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/robots", {
    data: {
      name: "Navigation demo",
      site: "Munich",
      manufacturer: "Demo",
      type: "inspection",
      integrationType: "ros2",
    },
  });
  expect(response.status()).toBe(201);
  const robot = (await response.json()) as { id: string };
  try {
    await page.goto(`/robots/${robot.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Navigation demo" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Fleet", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  } finally {
    await request.delete(`/api/robots/${robot.id}`);
  }
});
