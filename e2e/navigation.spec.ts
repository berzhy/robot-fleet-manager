import { expect } from "@playwright/test";
import { test } from "./fixtures";

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
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.goto("/integrations");
  await expect(
    page.getByRole("heading", { level: 1, name: "Integrations" }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: "Fleet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fleet dashboard" }),
  ).toBeVisible();
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
