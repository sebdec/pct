import { expect, test } from "@playwright/test";

test("renders the complete glossary with shared navigation", async ({
  page,
}) => {
  await page.goto("/glossary");

  await expect(
    page.getByRole("heading", { name: "Glossaire", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".glossary-entry")).toHaveCount(39);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(
    page.getByRole("generic", { name: "Index alphabétique" }),
  ).toHaveCount(0);
  await expect(
    page.locator("a[aria-current='page']:visible", { hasText: "Glossaire" }),
  ).toHaveCount(1);

  await page.goto("/");
  await expect(
    page
      .locator(".editorial-rich-text")
      .getByRole("link", { name: "Glossaire", exact: true }),
  ).toHaveAttribute("href", "/glossary");
});

test("supports stable direct links to glossary definitions", async ({
  page,
}) => {
  await page.goto("/glossary#trail-angel");

  const entry = page.locator("#trail-angel");
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute("tabindex", "-1");
  await expect(entry).toContainText("Trail angel");
  await expect
    .poll(() =>
      entry.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= 0 && bounds.top < window.innerHeight;
      }),
    )
    .toBe(true);
});

test("keeps the full glossary readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/glossary");
  await expect(page.locator(".glossary-entry")).toHaveCount(39);
  await expect(page.locator(".glossary-entry:visible")).toHaveCount(39);

  await context.close();
});

test("keeps the glossary and shared navigation within narrow viewports", async ({
  page,
}) => {
  await page.goto("/glossary");

  for (const width of [736, 360]) {
    await page.setViewportSize({ width, height: 900 });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    await expect
      .poll(() =>
        page
          .locator(".glossary-entry")
          .first()
          .evaluate(
            (entry) =>
              getComputedStyle(entry).gridTemplateColumns.split(" ").length,
          ),
      )
      .toBe(1);
    await expect(page.locator(".mobile-navigation a:visible")).toHaveCount(5);
    await expect(
      page.locator(".mobile-navigation a[aria-current='page']:visible"),
    ).toHaveText("Glossaire");
  }
});

test("shares its page alignment and heading scale with equipment", async ({
  page,
}) => {
  await page.goto("/gear");
  const gearLayout = await page.locator(".editorial-page").evaluate((main) => {
    const bounds = main.getBoundingClientRect();
    const heading = main.querySelector("h1");

    return {
      left: bounds.left,
      width: bounds.width,
      headingSize: heading ? getComputedStyle(heading).fontSize : null,
    };
  });

  await page.goto("/glossary");
  const glossaryLayout = await page
    .locator(".editorial-page")
    .evaluate((main) => {
      const bounds = main.getBoundingClientRect();
      const heading = main.querySelector("h1");

      return {
        left: bounds.left,
        width: bounds.width,
        headingSize: heading ? getComputedStyle(heading).fontSize : null,
      };
    });

  expect(glossaryLayout).toEqual(gearLayout);
});
