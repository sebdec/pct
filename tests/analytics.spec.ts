import { expect, test } from "@playwright/test";

test("persists and applies the analytics opt-out", async ({ page }) => {
  await page.goto("/?analytics=off");

  await expect(page).toHaveURL("/");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        preference: localStorage.getItem("pct.analytics.disabled"),
        event: window.webAnalyticsBeforeSend?.({
          type: "pageview",
          url: window.location.href,
        }),
      })),
    )
    .toEqual({ preference: "true", event: null });

  await page.goto("/?analytics=on");

  await expect(page).toHaveURL("/");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        preference: localStorage.getItem("pct.analytics.disabled"),
        event: window.webAnalyticsBeforeSend?.({
          type: "pageview",
          url: window.location.href,
        }),
      })),
    )
    .toEqual({
      preference: null,
      event: { type: "pageview", url: "http://127.0.0.1:4323/" },
    });
});
