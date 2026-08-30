import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/journal/day-001",
  "/map/day-050",
  "/gear",
  "/glossary",
  "/fr",
  "/fr/journal/day-001",
  "/fr/map/day-050",
  "/fr/gear",
  "/fr/glossary",
] as const;

for (const route of routes) {
  test(`${route} has no automated WCAG A or AA violations`, async ({
    page,
  }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    if (route.includes("/map")) {
      await expect(page.locator(".maplibregl-map")).toBeVisible();
    }

    const results = await new AxeBuilder({ page })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22a",
        "wcag22aa",
      ])
      .analyze();

    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  });
}

test("keeps primary controls keyboard accessible", async ({ page }) => {
  await page.goto("/fr/journal/day-034");

  const journalLink = page
    .getByRole("link", { name: "Journal", exact: true })
    .first();
  await journalLink.focus();
  await expect(journalLink).toBeFocused();
  await expect(journalLink).toHaveCSS("outline-style", "solid");

  const settings = page.getByRole("button", { name: "Réglages" });
  await settings.focus();
  await settings.press("Enter");
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("radio", { name: "Kilomètres" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settings).toHaveAttribute("aria-expanded", "false");

  const journalSlider = page.getByRole("slider", {
    name: "Choisir une journée du journal",
  });
  await journalSlider.focus();
  await expect(journalSlider).toBeFocused();
  await journalSlider.press("ArrowRight");
  await expect(page).toHaveURL(/\/fr\/journal\/day-035$/);

  await page.goto("/fr/map/day-050");
  const mapSlider = page.getByRole("slider", {
    name: "Choisir une position sur le parcours",
  });
  const mapValue = Number(await mapSlider.inputValue());
  await mapSlider.focus();
  await expect(mapSlider).toBeFocused();
  await mapSlider.press("ArrowRight");
  await expect(mapSlider).toHaveValue((mapValue + 0.1).toFixed(1));
  await page.getByRole("button", { name: "Recentrer sur le PCT" }).focus();
  await expect(
    page.getByRole("button", { name: "Recentrer sur le PCT" }),
  ).toBeFocused();
});

test("removes decorative motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr/gear");

  const transitionDuration = await page
    .locator(".gear-chart__segment")
    .first()
    .evaluate((segment) =>
      parseFloat(getComputedStyle(segment).transitionDuration),
    );
  expect(transitionDuration).toBeLessThanOrEqual(0.001);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
});
