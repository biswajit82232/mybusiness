/**
 * Local-only auth (no Supabase env). First run registers; later runs sign in.
 */
const E2E_EMAIL = "e2e@example.com";
const E2E_PASSWORD = "PlaywrightE2E1!";

export async function signInOrRegister(page) {
  await page.goto("/", { waitUntil: "load" });
  await page.locator(".login-shell").waitFor({ state: "visible", timeout: 60_000 });
  /** When `VITE_SUPABASE_*` are set, pick local-only auth so tests need no cloud account. */
  const thisDevice = page.getByRole("button", { name: "This device only" });
  if (await thisDevice.isVisible().catch(() => false)) {
    await thisDevice.click();
  }
  const submit = page.locator("form.login-form button[type='submit']");
  await submit.waitFor({ state: "visible" });
  const label = (await submit.innerText()).trim();
  await page.locator('input[name="email"]').fill(E2E_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  if (label.includes("Create")) {
    await page.locator('input[name="confirm"]').fill(E2E_PASSWORD);
  }
  await submit.click();
}

export async function dismissWelcomeIfPresent(page) {
  const overlay = page.locator(".welcome-overlay");
  try {
    await overlay.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    return;
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await overlay.waitFor({ state: "hidden", timeout: 10_000 });
}
