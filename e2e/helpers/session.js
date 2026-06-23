import { expect } from "@playwright/test";
import { dismissWelcomeIfPresent, signInOrRegister } from "./auth.js";

/** Log in (local), wait for dashboard, dismiss welcome modal. */
export async function bootstrapLoggedIn(page) {
  await signInOrRegister(page);
  await expect(page.locator(".home-page")).toBeVisible({ timeout: 120_000 });
  await dismissWelcomeIfPresent(page);
}
