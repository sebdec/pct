import { expect, test } from "@playwright/test";

test("selects a day and a mile without changing the URL", async ({ page }) => {
  await page.goto("/map");

  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole("heading", { name: "Jour 1" })).toBeVisible();
  await expect(page.locator("#map-mile")).toHaveValue("0");

  await page.locator("#map-day").selectOption("day-028");
  await expect(page.getByRole("heading", { name: "Jour 28" })).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);

  await page.locator("#map-mile").fill("150");
  await expect(page.locator("#map-mile")).toHaveValue("150");
  await expect(page).toHaveURL(/\/map$/);
});

test("opens a stable day URL at that day's final mile", async ({ page }) => {
  await page.goto("/map/day-028");

  await expect(page).toHaveURL(/\/map\/day-028$/);
  await expect(page.getByRole("heading", { name: "Jour 28" })).toBeVisible();
  await expect(page.locator("#map-day")).toHaveValue("day-028");
  await expect(page.locator("#map-mile")).toHaveValue("703");
  await expect(
    page.getByRole("link", { name: "Carte", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("keeps the map page within the mobile viewport", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: "Jour 1" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  await expect(
    page.getByRole("link", { name: "Carte", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
