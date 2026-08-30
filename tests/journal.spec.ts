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
  await expect(
    page.getByRole("link", { name: "Voir sur la carte", exact: true }),
  ).toHaveClass(/pct-text-link/);
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
    "mi",
  );
  await expect(page.getByLabel("Accès rapide aux journées")).not.toContainText(
    "Position",
  );

  const progressColors = await page
    .locator(".journal-progress .trail-progress__copy")
    .evaluate((copy) => {
      const region = copy.querySelector(":scope > span");
      const unit = copy.querySelector("[data-pct-unit-value]");
      if (!region || !unit) throw new Error("Missing progress labels.");

      return {
        neutral: getComputedStyle(copy).color,
        region: getComputedStyle(region).color,
        unit: getComputedStyle(unit).color,
      };
    });
  expect(progressColors.region).not.toBe(progressColors.neutral);
  expect(progressColors.unit).toBe(progressColors.neutral);
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
  for (const width of [736, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/journal/day-034");
    await expect(page.getByRole("heading", { name: "Jour 34" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  }
});

test("places the heading before the sticky navigator on one reading width", async ({
  page,
}) => {
  for (const width of [736, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/journal/day-034");

    const layout = await page.evaluate(() => {
      const heading = document.querySelector<HTMLElement>(".trail-day-summary");
      const navigator = document.querySelector<HTMLElement>(
        ".journal-day-navigator",
      );
      const metrics = document.querySelector<HTMLElement>(".trail-metrics");
      const article = document.querySelector<HTMLElement>(".journal-layout");
      const pageShell = document.querySelector<HTMLElement>(".reading-page");
      const footer = document.querySelector<HTMLElement>(".site-footer");

      if (!heading || !navigator || !metrics || !article || !pageShell || !footer) {
        throw new Error("Missing Journal reading layout elements.");
      }

      const bounds = [heading, navigator, metrics, article].map((element) => {
        const rectangle = element.getBoundingClientRect();

        return {
          left: Math.round(rectangle.left),
          right: Math.round(rectangle.right),
        };
      });

      return {
        bounds,
        headingBeforeNavigator: Boolean(
          heading.compareDocumentPosition(navigator) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        navigatorPosition: getComputedStyle(navigator).position,
        shell: {
          left: pageShell.getBoundingClientRect().left,
          width: pageShell.getBoundingClientRect().width,
        },
        footer: {
          left: footer.getBoundingClientRect().left,
          width: footer.getBoundingClientRect().width,
        },
      };
    });

    expect(layout.headingBeforeNavigator).toBe(true);
    expect(layout.navigatorPosition).toBe("sticky");
    expect(new Set(layout.bounds.map(({ left }) => left)).size).toBe(1);
    expect(new Set(layout.bounds.map(({ right }) => right)).size).toBe(1);
    expect(layout.footer).toEqual(layout.shell);
    await expect(page.locator(".journal-navigation")).toHaveCSS(
      "border-top-width",
      "0px",
    );
  }
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

test("accumulates rapid arrow clicks before navigating", async ({ page }) => {
  async function clickRapidly(
    direction: "précédent" | "suivant",
    count: number,
  ) {
    await page.evaluate(
      async ({ direction, count }) => {
        for (let clickIndex = 0; clickIndex < count; clickIndex += 1) {
          const link = document.querySelector<HTMLAnchorElement>(
            `nav[aria-label="Accès rapide aux journées"] a[aria-label^="Jour ${direction}"]`,
          );
          if (!link) throw new Error(`Missing ${direction}-day control.`);
          link.click();
          await new Promise(requestAnimationFrame);
        }
      },
      { direction, count },
    );
  }

  await page.goto("/journal/day-034");
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".journal-day-navigator astro-island")
        ?.hasAttribute("ssr"),
  );

  await clickRapidly("suivant", 3);
  await expect(page).toHaveURL(/\/journal\/day-037$/);

  await page.waitForFunction(
    () =>
      !document
        .querySelector(".journal-day-navigator astro-island")
        ?.hasAttribute("ssr"),
  );
  await clickRapidly("précédent", 2);
  await expect(page).toHaveURL(/\/journal\/day-035$/);
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

test("keeps region and section aligned without a separator", async ({
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
    const regionLabelBounds = region
      .querySelector("dt")!
      .getBoundingClientRect();
    const sectionLabelBounds = section
      .querySelector("dt")!
      .getBoundingClientRect();
    const regionValueBounds = region
      .querySelector("dd")!
      .getBoundingClientRect();
    const sectionValueBounds = section
      .querySelector("dd")!
      .getBoundingClientRect();
    return {
      horizontalBorderWidth: getComputedStyle(region).borderBottomWidth,
      verticalBorderWidth: getComputedStyle(region).borderRightWidth,
      separatorContent: getComputedStyle(region, "::after").content,
      regionTop: regionBounds.top,
      sectionTop: sectionBounds.top,
      regionLabelTop: regionLabelBounds.top,
      sectionLabelTop: sectionLabelBounds.top,
      regionValueTop: regionValueBounds.top,
      sectionValueTop: sectionValueBounds.top,
    };
  });

  expect(contextLayout.horizontalBorderWidth).toBe("0px");
  expect(contextLayout.verticalBorderWidth).toBe("0px");
  expect(contextLayout.separatorContent).toBe("none");
  expect(contextLayout.regionTop).toBe(contextLayout.sectionTop);
  expect(contextLayout.regionLabelTop).toBe(contextLayout.sectionLabelTop);
  expect(contextLayout.regionValueTop).toBe(contextLayout.sectionValueTop);
  const metricBorders = await page
    .locator(".trail-metrics__metric")
    .evaluateAll((metrics) =>
      metrics.map((metric) => getComputedStyle(metric).borderRightWidth),
    );
  expect(new Set(metricBorders)).toEqual(new Set(["0px"]));
});
