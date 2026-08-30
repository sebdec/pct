import { expect, test } from "@playwright/test";

test("persists accessible display preferences across the site", async ({
  page,
}) => {
  await page.goto("/fr");

  const trigger = page.getByRole("button", {
    name: "Réglages",
  });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const popover = page.locator("#display-preferences");
  await expect(popover).toBeVisible();
  await expect(popover.getByRole("heading")).toHaveCount(0);
  await expect(popover.getByRole("group", { name: "Thème" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Français" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /English/ })).toBeEnabled();
  await expect(page.getByRole("radio", { name: "Kilomètres" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Grammes" })).toBeChecked();
  await expect(popover).toContainText("🇫🇷");
  await expect(popover).toContainText("🇺🇸");
  const sharedBackground = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("#display-preferences");
    return {
      body: getComputedStyle(document.body).backgroundColor,
      panel: panel ? getComputedStyle(panel).backgroundColor : null,
    };
  });
  expect(sharedBackground.panel).toBe(sharedBackground.body);

  await popover
    .locator('label:has(input[name="distanceUnit"][value="mi"])')
    .click();
  await popover
    .locator('label:has(input[name="weightUnit"][value="oz"])')
    .click();
  await expect(
    page.getByRole("region", { name: "Le parcours en quelques chiffres" }),
  ).toContainText("2 656 mi");

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.goto("/fr/journal/day-034");
  await expect(page.getByLabel("Repères de la journée")).toContainText("mi");
  await page.goto("/fr/map/day-034");
  await expect(page.getByLabel("Repères de la journée")).toContainText("mi");
  await expect(page.locator("#map-mile-progress")).toHaveAttribute(
    "aria-valuetext",
    /mi$/,
  );

  await page.goto("/fr/gear");
  await expect(page.locator(".gear-chart__summary")).toContainText("oz");
  await expect(page.locator(".gear-list")).toContainText("oz");
  await expect(page.locator(".gear-chart__visual")).toHaveAttribute(
    "aria-label",
    /oz/,
  );

  await page.reload();
  await trigger.click();
  await expect(page.getByRole("radio", { name: "Miles" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Onces" })).toBeChecked();
});

test("switches language without losing the current day", async ({ page }) => {
  await page.goto("/fr/journal/day-034");
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.locator('label[title="English"]').click();

  await expect(page).toHaveURL("/journal/day-034");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator(".header-preferences__trigger").click();
  await page.locator('label[title="Français"]').click();

  await expect(page).toHaveURL("/fr/journal/day-034");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test.describe("US locale defaults", () => {
  test.use({ locale: "en-US" });

  test("starts with miles and ounces", async ({ page }) => {
    await page.goto("/fr");
    await page.getByRole("button", { name: "Réglages" }).click();

    await expect(page.getByRole("radio", { name: "Miles" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Onces" })).toBeChecked();
  });
});

test("keeps the responsive header within the viewport", async ({ page }) => {
  await page.goto("/fr");

  for (const width of [736, 360]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const wordmark = document.querySelector<HTMLElement>(".wordmark");
      const preferences = document.querySelector<HTMLElement>(
        ".header-preferences",
      );
      const mobileNavigation =
        document.querySelector<HTMLElement>(".mobile-navigation");
      if (!wordmark || !preferences || !mobileNavigation) {
        throw new Error("Missing responsive header elements.");
      }

      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        wordmarkCenter: Math.round(
          wordmark.getBoundingClientRect().top +
            wordmark.getBoundingClientRect().height / 2,
        ),
        preferencesCenter: Math.round(
          preferences.getBoundingClientRect().top +
            preferences.getBoundingClientRect().height / 2,
        ),
        wordmarkTop: Math.round(wordmark.getBoundingClientRect().top),
        navigationTop: Math.round(mobileNavigation.getBoundingClientRect().top),
      };
    });

    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(
      Math.abs(layout.preferencesCenter - layout.wordmarkCenter),
    ).toBeLessThanOrEqual(1);
    expect(layout.navigationTop).toBeGreaterThan(layout.wordmarkTop);
  }
});
