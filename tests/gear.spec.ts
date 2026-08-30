import { expect, test } from "@playwright/test";

test("renders the simplified equipment chart and complete manifest", async ({
  page,
}) => {
  await page.goto("/gear");

  await expect(
    page.getByRole("heading", { name: "Équipement", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".gear-hero")).not.toContainText("Poids de base");
  await expect(
    page.getByRole("region", { name: "Répartition du poids" }),
  ).toBeVisible();
  await expect(page.locator(".gear-chart__segment")).toHaveCount(7);
  await expect(page.locator(".gear-chart__visual svg")).toHaveAttribute(
    "focusable",
    "false",
  );
  await expect(page.locator(".gear-chart__visual svg")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".gear-chart__visual > p")).toHaveCount(0);
  await expect(page.locator(".gear-chart__summary")).toContainText("6 992 g");
  await expect(page.locator(".gear-chart__summary")).toContainText("1 712 g");
  await expect(page.locator(".gear-chart__summary")).toContainText("5 280 g");
  await expect(page.locator(".gear-chart__summary dt")).toHaveText([
    "Poids de base",
    "Porté",
    "Total",
  ]);
  const summaryLabelColors = await page
    .locator(".gear-chart__summary dt")
    .evaluateAll((labels) =>
      labels.map((label) => getComputedStyle(label).color),
    );
  expect(new Set(summaryLabelColors).size).toBe(1);
  const summaryLabelWeights = await page
    .locator(".gear-chart__summary dt")
    .evaluateAll((labels) =>
      labels.map((label) => getComputedStyle(label).fontWeight),
    );
  expect(new Set(summaryLabelWeights).size).toBe(1);
  const baseWeightFontSize = await page
    .locator(".gear-chart__base-weight dd")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  const summaryWeightFontSize = await page
    .locator(".gear-chart__summary dd")
    .nth(1)
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(baseWeightFontSize).toBeGreaterThan(summaryWeightFontSize);
  const sierraLegendLink = page.locator(
    '.gear-chart__details a[href="#sierra-title"]',
  );
  await expect(sierraLegendLink).toContainText("Sierra");
  await expect(sierraLegendLink).toContainText("(+1 732 g)");

  const firstSegment = page.locator(".gear-chart__segment").first();
  const chart = page.locator(".gear-chart");
  await firstSegment.dispatchEvent("pointerenter");
  await expect(chart).toHaveClass(/is-selecting/);
  await expect(page.locator(".gear-chart__segment.is-active")).toHaveCount(1);
  await expect(page.locator(".gear-chart__details li.is-active")).toHaveCount(
    1,
  );
  await expect(firstSegment).toHaveAttribute("data-gear-href", "#big-4-title");
  const chartBox = await page.locator(".gear-chart__visual svg").boundingBox();
  expect(chartBox).not.toBeNull();
  await page.mouse.click(
    chartBox!.x + chartBox!.width * 0.87,
    chartBox!.y + chartBox!.height * 0.5,
  );
  await expect(page).toHaveURL(/#big-4-title$/);
  const activeElementTagName = await page.evaluate(
    () => document.activeElement?.tagName,
  );
  expect(activeElementTagName).not.toMatch(/^(a|circle|svg)$/i);

  await page.mouse.move(
    chartBox!.x + chartBox!.width * 0.87,
    chartBox!.y + chartBox!.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    chartBox!.x + chartBox!.width + 60,
    chartBox!.y + chartBox!.height + 60,
    { steps: 8 },
  );
  await page.mouse.up();
  const dragState = await page.evaluate(() => ({
    activeElement: document.activeElement?.tagName,
    selection: window.getSelection()?.toString() ?? "",
  }));
  expect(dragState.selection).toBe("");
  expect(dragState.activeElement).not.toMatch(/^(a|circle|svg)$/i);
  const firstLegendLink = page.locator(
    '.gear-chart__details a[href="#big-4-title"]',
  );
  await page.evaluate(() => {
    window.location.hash = "";
  });
  await firstLegendLink.click();
  await expect(page).toHaveURL(/#big-4-title$/);

  const categoryColors = await page
    .locator(".gear-chart__segment")
    .evaluateAll((segments) =>
      segments.map((segment) => getComputedStyle(segment).stroke),
    );
  expect(new Set(categoryColors).size).toBe(7);

  await expect(page.locator(".gear-list li")).toHaveCount(66);
  await expect(page.locator(".gear-list a[target='_blank']")).toHaveCount(45);
  const productLink = page.getByRole("link", { name: "Sac", exact: true });
  await expect(productLink).toHaveAttribute(
    "href",
    "https://hyperlitemountaingear.com/products/junction",
  );
  const creditLink = page.getByRole("link", {
    name: "LighterPack",
    exact: true,
  });
  await expect(productLink).toHaveClass(/text-link/);
  await expect(creditLink).toHaveClass(/text-link/);
  await expect(creditLink).toHaveAttribute(
    "href",
    "https://lighterpack.com/r/xy5ax3",
  );
  await expect(page.locator(".gear-credits")).toHaveCount(0);
  await expect(page.locator(".page-credits")).toContainText(
    "Credits: LighterPack",
  );
  await expect(page.getByRole("heading", { name: "Sierra" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Équipement", exact: true }).first(),
  ).toHaveAttribute("aria-current", "page");
});

test("keeps the equipment page within narrow viewports", async ({ page }) => {
  await page.goto("/gear");

  for (const width of [736, 360]) {
    await page.setViewportSize({ width, height: 900 });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  }
});
