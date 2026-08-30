import { expect, test } from "@playwright/test";

test("presents the journey and its main entrances", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Pacific Crest Trail 2026");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Pacific Crest Trail 2026",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Commencer par le jour 1" }),
  ).toHaveAttribute("href", "/journal/day-001");
  const figures = page.locator(".editorial-rich-text");
  await expect(
    figures.getByRole("link", { name: "Carte", exact: true }),
  ).toHaveAttribute("href", "/map");

  await expect(
    page.getByRole("heading", { name: "Le parcours en quelques chiffres" }),
  ).toBeVisible();
  await expect(figures).toContainText("96");
  await expect(figures).toContainText("2 656");
  await expect(figures).toContainText("2 656 miles");
  await expect(figures).toContainText("27,7 miles par jour");
  await expect(figures).toContainText("+140 706 m");
  await expect(figures).toContainText("+1 466 m par jour");
  await expect(figures).toContainText("−140 301 m");
  await expect(figures).toContainText("−1 461 m par jour");
  await expect(figures).toContainText("Washington");
  await expect(figures).not.toContainText("·");
  await expect(figures).not.toContainText("Les moyennes sont calculées");

  for (const name of ["Journal", "Carte", "Équipement", "Glossaire"]) {
    await expect(
      figures.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  }

  await expect(
    page.getByText("Le journal complet est en préparation."),
  ).toHaveCount(0);

  await expect(
    page.getByRole("heading", { name: "Pourquoi le PCT" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Découvrir l’aventure" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ce que j’ai aimé" }),
  ).toBeVisible();
  await expect(page.locator(".editorial-rich-text li")).toHaveCount(11);
  for (const reason of [
    "Solitude:",
    "Intensité:",
    "Sport:",
    "Paysages:",
    "Wildlife:",
    "Vie sociale:",
    "Planification:",
    "Toujours quelque chose à faire:",
    "Un stress différent:",
    "Nourriture:",
    "Équipement:",
  ]) {
    await expect(page.getByText(reason, { exact: true })).toBeVisible();
  }
  await expect(figures).toContainText("Sebdec / One Pole");
  await expect(
    page.getByRole("link", { name: "carte officielle du PCT" }),
  ).toHaveAttribute(
    "href",
    "https://www.pcta.org/discover-the-trail/maps/overview-maps/",
  );
  await expect(
    page.getByRole("link", { name: "Leave No Trace:" }),
  ).toHaveAttribute("href", "https://lnt.org/why/7-principles/");
  const leaveNoTraceLink = page.getByRole("link", {
    name: "Leave No Trace:",
  });
  const leaveNoTraceColors = await leaveNoTraceLink.evaluate((link) => ({
    link: getComputedStyle(link).color,
    strong: getComputedStyle(link.querySelector("strong")!).color,
  }));
  expect(leaveNoTraceColors.strong).toBe(leaveNoTraceColors.link);
  await expect(figures).toContainText("Hike Your Own Hike");
  await expect(
    page.locator(".site-header a[aria-current='page']:visible"),
  ).toHaveText("Accueil");

  await expect(page.locator(".trail-overview-metrics__metric")).toHaveCount(8);
  await expect(
    page.locator(".trail-overview-metrics .trail-metric-icon"),
  ).toHaveCount(8);

  const regionColors = await page
    .locator(".trail-overview-metrics__region")
    .evaluateAll((regions) =>
      regions.map((region) => getComputedStyle(region).color),
    );
  expect(regionColors).toHaveLength(5);
  expect(new Set(regionColors).size).toBe(5);

  for (const linkName of [
    "Pacific Crest Trail",
    "Leave No Trace:",
    "carte officielle du PCT",
  ]) {
    const externalLink = page.getByRole("link", {
      name: linkName,
      exact: true,
    });
    await expect(externalLink).toHaveAttribute("target", "_blank");
    await expect(externalLink).toHaveAttribute(
      "rel",
      /^(?:noopener noreferrer|noreferrer noopener)$/,
    );

    const externalIndicator = await externalLink.evaluate((link) => {
      const styles = getComputedStyle(link, "::after");
      return {
        content: styles.content,
        maskImage: styles.maskImage,
      };
    });
    expect(externalIndicator.content).toBe('""');
    expect(externalIndicator.maskImage).not.toBe("none");
  }

  await expect(
    figures.getByRole("link", { name: "Journal", exact: true }),
  ).not.toHaveAttribute("target", "_blank");
});

test("reuses the editorial shell and heading scale", async ({ page }) => {
  async function readShell() {
    return page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const heading = document.querySelector("h1");
      const main = document.querySelector(".editorial-page");

      if (!heading || !main) throw new Error("Missing editorial shell.");

      return {
        backgroundColor: body.backgroundColor,
        backgroundImage: body.backgroundImage,
        headingSize: getComputedStyle(heading).fontSize,
        mainWidth: main.getBoundingClientRect().width,
        centerOffset: Math.abs(
          main.getBoundingClientRect().left -
            (window.innerWidth - main.getBoundingClientRect().right),
        ),
      };
    });
  }

  await page.goto("/");
  const homeShell = await readShell();
  await expect(page.locator("body")).toHaveClass(/trail-shell/);

  await page.goto("/glossary");
  const glossaryShell = await readShell();

  expect(homeShell.backgroundColor).toBe(glossaryShell.backgroundColor);
  expect(homeShell.backgroundImage).toBe(glossaryShell.backgroundImage);
  expect(homeShell.headingSize).toBe(glossaryShell.headingSize);
  expect(homeShell.mainWidth).toBeLessThanOrEqual(glossaryShell.mainWidth);
  expect(homeShell.centerOffset).toBeLessThan(1);
});

test("keeps the homepage within responsive viewports", async ({ page }) => {
  for (const width of [736, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Pacific Crest Trail 2026",
      }),
    ).toBeVisible();
  }
});
