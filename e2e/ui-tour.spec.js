import { test, expect } from "@playwright/test";
import { bootstrapLoggedIn } from "./helpers/session.js";
import { MAIN_NAV_ROUTES } from "./helpers/routes.js";

test.describe.configure({ timeout: 300_000 });

test.describe("UI tour (main nav)", () => {
  test("every sidebar tab renders without crash", async ({ page }) => {
    const jsErrors = [];
    page.on("pageerror", (err) => jsErrors.push(String(err)));

    await page.setViewportSize({ width: 1280, height: 720 });
    await bootstrapLoggedIn(page);

    const nav = page.getByRole("navigation", { name: "Main navigation" });

    for (const route of MAIN_NAV_ROUTES) {
      const btn = nav.getByRole("button", { name: route.sidebar, exact: true });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();

      if (route.assert.kind === "home") {
        await expect(page.locator(".home-page")).toBeVisible({ timeout: 30_000 });
      } else {
        await expect(page.locator(".main-stage h1.tab-title")).toHaveText(route.assert.text, { timeout: 30_000 });
      }
    }

    expect(jsErrors, `Uncaught page errors: ${jsErrors.join("\n")}`).toEqual([]);
  });
});
