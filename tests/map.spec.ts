import { expect, test } from "@playwright/test";

test("selects the journey without a native day menu or URL changes", async ({
  page,
}) => {
  await page.goto("/map");

  await expect(page).toHaveURL(/\/map$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Jour 1/ }),
  ).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.locator("#map-mile-progress")).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Recentrer sur le PCT" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voir sur le journal" }),
  ).toHaveAttribute("href", "/journal/day-001");
  await expect(
    page.getByRole("link", { name: "Voir sur le journal" }),
  ).toHaveClass(/pct-text-link/);

  const metaAlignment = await page.evaluate(() => {
    const date = document.querySelector(".trail-day-summary__date");
    const action = document.querySelector(".trail-day-summary__action");
    if (!date || !action) throw new Error("Missing map summary metadata.");
    return Math.abs(
      date.getBoundingClientRect().top - action.getBoundingClientRect().top,
    );
  });
  expect(metaAlignment).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Jour suivant, jour 2" }).click();
  await expect(page.getByRole("heading", { name: /Jour 2/ })).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);

  await page.locator("#map-mile-progress").press("End");
  await expect(page.locator("#map-mile-progress")).toHaveValue("2656");
  await expect(page.getByRole("heading", { name: /Jour 97/ })).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);
});

test("opens a stable day URL at that day's final mile", async ({ page }) => {
  await page.goto("/map/day-028");

  await expect(page).toHaveURL(/\/map\/day-028$/);
  await expect(page.getByRole("heading", { name: /Jour 28/ })).toBeVisible();
  await expect(page.locator("#map-mile-progress")).toHaveValue("703");
  await expect(page.locator("time[datetime='2026-05-15']")).toHaveText(
    "15 mai 2026",
  );
  await expect(page.getByLabel("Repères de la journée")).toContainText(
    "Section",
  );
  await expect(
    page
      .locator(".trail-map-metrics .trail-metrics__section-list span")
      .first(),
  ).toHaveAttribute("title", /.+/);

  const contextLayout = await page.evaluate(() => {
    const region = document.querySelector(
      ".trail-map-metrics .trail-metrics__region",
    );
    const section = document.querySelector(
      ".trail-map-metrics .trail-metrics__section",
    );
    const regionTitle = region?.querySelector("dt");
    const sectionTitle = section?.querySelector("dt");
    if (!region || !section || !regionTitle || !sectionTitle) {
      throw new Error("Missing map metrics.");
    }
    return {
      vertical: getComputedStyle(region, "::after").display,
      regionTop: Math.round(regionTitle.getBoundingClientRect().top),
      sectionTop: Math.round(sectionTitle.getBoundingClientRect().top),
    };
  });
  expect(contextLayout.vertical).toBe("none");
  expect(contextLayout.regionTop).toBe(contextLayout.sectionTop);
  await expect(
    page.locator(".trail-map-metrics .trail-metrics__section-list"),
  ).toHaveAttribute("title", /.+/);
  await expect(
    page.getByRole("link", { name: "Carte", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  const mobileNavigationColors = await page.evaluate(() => {
    const mobileNavigation = document.querySelector(".mobile-navigation");
    const journal = mobileNavigation?.querySelector("a:not(.active)");
    const current = mobileNavigation?.querySelector("a.active");
    if (!journal || !current) throw new Error("Missing mobile navigation.");
    return {
      journal: getComputedStyle(journal).color,
      current: getComputedStyle(current).color,
    };
  });
  expect(mobileNavigationColors.current).not.toBe(
    mobileNavigationColors.journal,
  );
});

test("keeps the map page within the mobile viewport", async ({ page }) => {
  await page.goto("/map");
  await expect(page.getByRole("heading", { name: /Jour 1/ })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  await expect(
    page.getByRole("link", { name: "Carte", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".page-credits")).toHaveCount(0);
  const attribution = page.locator(".maplibregl-ctrl-attrib");
  await expect(attribution).toBeAttached();
  if (
    !(await attribution.evaluate((element) =>
      element.classList.contains("maplibregl-compact-show"),
    ))
  ) {
    await page.locator(".maplibregl-ctrl-attrib-button").click();
  }
  await expect(
    page.getByRole("link", { name: "OpenStreetMap", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "OpenStreetMap", exact: true }),
  ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await expect(
    page.getByRole("link", {
      name: "Trail data © Pacific Crest Trail Association, CC BY 4.0, 2026",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Natural Earth", exact: true }),
  ).toHaveCount(0);
});
