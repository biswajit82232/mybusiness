import { test, expect } from "@playwright/test";
import { bootstrapLoggedIn } from "./helpers/session.js";

test.describe("smoke", () => {
  test("local account reaches dashboard", async ({ page }) => {
    await bootstrapLoggedIn(page);
    await expect(page.locator(".home-hdr")).toBeVisible();
  });
});
