import { test, expect } from "@playwright/test";

const answers = ["013", "PÅ BRUA", "nøkel", "VENT!"];

async function ready(page) {
  await page.goto("./");
  await expect(page.locator("#offline-status")).toContainText("KLAR UTEN NETT");
}

async function solve(page) {
  await page.getByRole("button", { name: "ÅPNE SAKSMAPPEN" }).click();
  for (let i = 0; i < answers.length; i++) {
    await page.locator(`#answer-${i}`).fill(answers[i]);
    await page.locator(".clue-card").nth(i).getByRole("button", { name: "BEKREFT" }).click();
  }
  await expect(page.locator("#solved-count")).toHaveText("4");
}

async function supervisor(page) {
  await page.getByRole("button", { name: "Tilsyn", exact: true }).click();
}

test("archive loads with only local assets and caches the complete /halloween/ app", async ({ page }) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await ready(page);
  await expect(page).toHaveTitle("SAK 013 – Blodløpet");
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  expect(requests.every((url) => url.startsWith("http://127.0.0.1:4187/halloween/"))).toBe(true);
  expect(errors).toEqual([]);
  const cache = await page.evaluate(async () => {
    const key = (await caches.keys()).find((name) => name.startsWith("sak013-"));
    return (await (await caches.open(key)).keys()).map((entry) => new URL(entry.url).pathname);
  });
  expect(cache).toHaveLength(13);
  expect(cache).toContain("/halloween/case.config.js");
  expect(cache).toContain("/halloween/assets/icon-512.png");
});

test("accepts Norwegian variants, rejects wrong and empty answers, preserves drafts and progress", async ({ page }) => {
  await ready(page);
  await page.locator("#open-case").click();
  await page.locator(".clue-card").first().getByRole("button").click();
  await expect(page.locator("#feedback-0")).toContainText("Skriv inn");
  await page.locator("#answer-0").fill("14");
  await page.locator(".clue-card").first().getByRole("button").click();
  await expect(page.locator("#answer-0")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#answer-0").fill(" TRETTEN ");
  await page.locator(".clue-card").first().getByRole("button").click();
  await page.locator("#answer-1").fill("notat som ikke er sendt");
  await page.reload();
  await expect(page.locator("#investigation")).toBeVisible();
  await expect(page.locator("#solved-count")).toHaveText("1");
  await expect(page.locator("#answer-0")).toHaveAttribute("readonly", "");
  await expect(page.locator("#answer-1")).toHaveValue("notat som ikke er sendt");
  await expect(page.locator("#unlock-ready")).toBeHidden();
  expect(await page.evaluate(async () => {
    const { acceptsAnswer } = await import("./app.js");
    const { CASE_CONFIG } = await import("./case.config.js");
    return [
      acceptsAnswer("NOE HELT ANNET", CASE_CONFIG.clues[2]),
      acceptsAnswer("nøkel", CASE_CONFIG.clues[2]),
      acceptsAnswer("NØKKELEN", CASE_CONFIG.clues[2]),
      acceptsAnswer("PAA BRUA", CASE_CONFIG.clues[1]),
    ];
  })).toEqual([false, true, true, true]);
});

test("entire timed experience, refresh and reset/replay work in airplane mode", async ({ page, context }) => {
  test.setTimeout(150000);
  await ready(page);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#offline-status")).toContainText("KLAR UTEN NETT");
  await solve(page);
  await page.locator("#unlock-case").click();
  await expect(page.locator("#decryption")).toBeVisible();
  await expect(page.locator("#revelation")).toBeVisible({ timeout: 25000 });
  await expect(page.locator("#finale")).toBeVisible({ timeout: 90000 });
  await expect(page.locator("#finale-title")).toHaveText("SE BAK DERE.");
  await page.reload();
  await expect(page.locator("#finale")).toBeVisible();
  await supervisor(page);
  await page.locator("#request-reset").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#welcome")).toBeVisible();
  await expect(page.locator("#sound-toggle")).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await solve(page);
  await supervisor(page);
  await expect(page.locator("#manual-finale")).not.toBeChecked();
  await page.locator("#supervisor-close").click();
  await page.locator("#unlock-case").click();
  await expect(page.locator("#decryption")).toBeVisible();
});

test("adult controls pause the sequence, skip safely, hold the final cue and reset all group data", async ({ page }) => {
  await ready(page);
  await supervisor(page);
  await page.locator("#manual-finale").check();
  await page.locator("#supervisor-close").click();
  await solve(page);
  await page.clock.install();
  await page.locator("#unlock-case").click();
  await supervisor(page);
  await page.clock.runFor(60000);
  await expect(page.locator("#decryption")).toBeVisible();
  await page.locator("#skip-animation").click();
  await expect(page.locator("#revelation")).toBeVisible();
  await supervisor(page);
  await page.locator("#skip-animation").click();
  await page.clock.runFor(120000);
  await expect(page.locator("#revelation")).toBeVisible();
  await expect(page.locator("#story-text p")).toHaveCount(4);
  await supervisor(page);
  await page.locator("#show-finale").click();
  await expect(page.locator("#finale")).toBeVisible();
  await supervisor(page);
  await page.locator("#request-reset").click();
  await page.locator("#cancel-reset").click();
  await expect(page.locator("#supervisor-dialog")).toBeVisible();
  await page.locator("#request-reset").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#welcome")).toBeVisible();
  await page.locator("#open-case").click();
  await expect(page.locator("#solved-count")).toHaveText("0");
  for (let i = 0; i < 4; i++) await expect(page.locator(`#answer-${i}`)).toHaveValue("");
  await supervisor(page);
  await expect(page.locator("#manual-finale")).toBeChecked();
});

test("two-second case-number hold opens discreet adult controls", async ({ page }) => {
  await ready(page);
  await page.locator("#case-reset").hover();
  await page.mouse.down();
  await page.waitForTimeout(1900);
  await page.mouse.up();
  await expect(page.locator("#supervisor-dialog")).toBeVisible();
});

test("sound is gesture-activated and works with generated local audio", async ({ page, context }) => {
  await ready(page);
  await context.setOffline(true);
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#open-case").click();
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-label")).toHaveText("LYD AV");
});

test("mobile and iPad layouts fit without horizontal overflow", async ({ page }) => {
  await ready(page);
  await page.screenshot({ path: "test-results/welcome-ipad.png", fullPage: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1194, height: 834 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 390) await page.screenshot({ path: "test-results/welcome-mobile.png", fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator("#open-case").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const input = await page.locator("#answer-0").boundingBox();
    expect(input.height).toBeGreaterThanOrEqual(44);
    await supervisor(page);
    await page.locator("#request-reset").click();
    await page.locator("#confirm-reset").click();
  }
});

test("storage failure is explicit and does not break the game", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await ready(page);
  await expect(page.locator("#storage-warning")).toBeVisible();
  await solve(page);
  await expect(page.locator("#unlock-ready")).toBeVisible();
});

test("reduced motion retains the story and the adult-controlled ending", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await supervisor(page);
  await page.locator("#manual-finale").check();
  await page.locator("#supervisor-close").click();
  await solve(page);
  await page.clock.install();
  await page.locator("#unlock-case").click();
  await page.clock.runFor(16000);
  await page.clock.runFor(100000);
  await expect(page.locator("#story-text p")).toHaveCount(4);
  await expect(page.locator("#revelation")).toBeVisible();
});
