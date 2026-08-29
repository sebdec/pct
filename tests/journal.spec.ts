import { expect, test } from "@playwright/test";

test("keeps French dates, the current Journal URL and the map deep link", async ({
  page,
}) => {
  await page.goto("/journal/day-001");

  await expect(page.locator("time[datetime='2026-04-18']")).toHaveText(
    "18 avril 2026",
  );
  await expect(
    page.getByRole("link", { name: "Journal", exact: true }).first(),
  ).toHaveAttribute("href", "/journal/day-001");
  await expect(
    page.getByRole("link", { name: "Voir sur la carte", exact: true }),
  ).toHaveAttribute("href", "/map/day-001");
  await expect(page.getByLabel("Repères de la journée")).toBeVisible();
  await expect(page.getByLabel("Repères de la journée")).toContainText(
    "Section",
  );
  await expect(page.getByLabel("Repères de la journée")).toContainText(
    "Région",
  );
  await expect(page.getByLabel("Repères de la journée")).toContainText(
    "Désert",
  );
  await expect(page.getByLabel("Repères de la journée")).toContainText(
    "Mexican Border → Warner Springs",
  );
  await expect(page.getByLabel("Repères de la journée")).toContainText(
    "Position",
  );
  await expect(page.getByLabel("Repères de la journée")).not.toContainText(
    "km",
  );
  await expect(page.getByLabel("Accès rapide aux journées")).not.toContainText(
    "Position",
  );
});

test("removes trail metrics and the map action after day 97", async ({
  page,
}) => {
  await page.goto("/journal/day-098");

  await expect(page.getByRole("heading", { name: "Jour 98" })).toBeVisible();
  await expect(page.getByLabel("Repères de la journée")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Voir sur la carte", exact: true }),
  ).toHaveCount(0);
});

test("keeps the refined Journal inside the viewport", async ({ page }) => {
  await page.goto("/journal/day-034");
  await expect(page.getByRole("heading", { name: "Jour 34" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});

test("keeps the current day while scrolling over the navigator", async ({
  page,
}) => {
  await page.goto("/journal/day-034");

  const navigator = page.getByLabel("Accès rapide aux journées");
  const range = page.getByRole("slider", {
    name: "Choisir une journée du journal",
  });

  await range.hover();
  await page.mouse.wheel(0, 600);

  await expect(navigator).toContainText("Jour 34");
  await expect(navigator).toContainText("Sierra");
});

test("aligns the progress fill with the hiker near the end of the journal", async ({
  page,
}) => {
  await page.goto("/journal/day-093");

  await expect(page.getByLabel("Accès rapide aux journées")).toHaveAttribute(
    "style",
    /--trail-progress:\s*calc\([^)]*rem\)/,
  );
});

test("keeps region and section aligned without joining their separators", async ({
  page,
}) => {
  await page.goto("/journal/day-005");

  const contextLayout = await page.evaluate(() => {
    const region = document.querySelector<HTMLElement>(
      ".trail-metrics__region",
    );
    const section = document.querySelector<HTMLElement>(
      ".trail-metrics__section",
    );

    if (!region || !section) {
      throw new Error("Missing journal context metrics.");
    }

    const regionBounds = region.getBoundingClientRect();
    const sectionBounds = section.getBoundingClientRect();
    const separatorBottom = Number.parseFloat(
      getComputedStyle(region, "::after").bottom,
    );

    return {
      regionTop: regionBounds.top,
      sectionTop: sectionBounds.top,
      separatorBottom,
    };
  });

  expect(contextLayout.regionTop).toBe(contextLayout.sectionTop);
  expect(contextLayout.separatorBottom).toBeGreaterThan(0);
});
