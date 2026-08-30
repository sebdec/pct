import { expect, test } from "@playwright/test";

test("renders the complete equipment manifest from source data", async ({
  page,
}) => {
  await page.goto("/gear");

  await expect(
    page.getByRole("heading", { name: "5,28 kg", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Poids de base", { exact: true })).toBeVisible();
  await expect(page.locator(".gear-list li")).toHaveCount(66);
  await expect(page.locator(".gear-list a[target='_blank']")).toHaveCount(45);
  await expect(
    page.locator(".gear-category__header").first(),
  ).not.toContainText("objets");
  await expect(
    page.getByRole("link", { name: "Sac", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://hyperlitemountaingear.com/products/junction",
  );
  const productLink = page.getByRole("link", { name: "Sac", exact: true });
  const creditLink = page.getByRole("link", {
    name: "LighterPack",
    exact: true,
  });
  await expect(productLink).toHaveClass(/text-link/);
  await expect(creditLink).toHaveClass(/text-link/);

  const restingColor = await productLink.evaluate(
    (link) => getComputedStyle(link).color,
  );
  await productLink.hover();
  await expect
    .poll(() => productLink.evaluate((link) => getComputedStyle(link).color))
    .not.toBe(restingColor);
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
