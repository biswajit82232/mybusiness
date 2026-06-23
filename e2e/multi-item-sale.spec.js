import { test, expect } from "@playwright/test";
import { bootstrapLoggedIn } from "./helpers/session.js";

/**
 * Multi-item invoice UI smoke: open the New Sale overlay and confirm the new
 * multi-line editor renders correctly — exactly one line by default and
 * "+ Add item" creates a second line. We intentionally don't drive the form
 * to a full save in CI: required-field permutations vary by stock settings
 * and aren't worth pinning here; `scripts/domain-sanity.mjs` already covers
 * the data shape on save.
 */
test.describe.configure({ timeout: 180_000 });

test.describe("multi-item sale (UI smoke)", () => {
  test("New Sale form starts with one line and supports adding another", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootstrapLoggedIn(page);

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByRole("button", { name: "Invoices", exact: true }).click();
    await expect(page.locator(".main-stage h1.tab-title")).toHaveText("Invoices");

    // Open the New Sale overlay. The label varies (FAB / button) so just match
    // anything that includes "new sale".
    await page.getByRole("button", { name: /new sale/i }).first().click();
    await expect(page.locator("#form-new-sale")).toBeVisible({ timeout: 20_000 });

    const lineRows = page.locator(".line-item-row");
    await expect(lineRows).toHaveCount(1);

    // The "+ Add item" affordance should be present and clickable.
    const addBtn = page.getByRole("button", { name: /add another item line/i });
    await addBtn.click();
    await expect(lineRows).toHaveCount(2);

    // Remove the second line — first line cannot be removed (count stays >= 1).
    await lineRows.nth(1).getByRole("button", { name: /remove item 2/i }).click();
    await expect(lineRows).toHaveCount(1);
  });
});
