import { test, expect } from "@playwright/test";
import { STORAGE_KEY, freshState, restoreState, departGroup, remainingTime, formatTime } from "../venterom/state.js";

test.use({ viewport: { width: 1920, height: 1080 } });

async function ready(page, path = "venterom/") {
  await page.goto(path);
  await expect(page.locator("#offline-status")).toHaveText("KLAR UTEN NETT");
}

async function freeze(page) {
  await page.clock.install({ time: new Date("2026-10-28T16:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-28T16:00:01Z"));
}

async function stored(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
}

async function settings(page) {
  await page.getByRole("button", { name: "Åpne voksenkontroll" }).click();
}

test("waiting-room state uses exact deadlines and rejects invalid or premature departures", () => {
  let state = freshState();
  let now = Date.UTC(2026, 9, 28, 16);
  expect(state.settings).toEqual({ groupCount: 5, intervalMinutes: 5, soundEnabled: false });
  expect(formatTime(300000)).toBe("05:00");
  expect(formatTime(299001)).toBe("05:00");
  expect(formatTime(299000)).toBe("04:59");
  expect(formatTime(1)).toBe("00:01");
  expect(formatTime(-1)).toBe("00:00");
  for (let group = 1; group <= 5; group++) {
    state = departGroup(state, now);
    expect(state.departures).toHaveLength(group);
    expect(restoreState(structuredClone(state))).toEqual(state);
    if (group < 5) {
      expect(state.nextDepartureAt).toBe(now + 300000);
      expect(() => departGroup(state, now + 299999)).toThrow("Vent");
      expect(remainingTime(state, now + 600000)).toBe(0);
    }
    now += 300000;
  }
  expect(state.nextDepartureAt).toBeNull();
  expect(() => departGroup(state, now)).toThrow("Alle");
  expect(() => restoreState({ ...state, departures: [null] })).toThrow();
  expect(() => restoreState({ ...state, settings: { ...state.settings, intervalMinutes: 0 } })).toThrow();
  const initial = freshState();
  expect(() => restoreState({ ...initial, nextDepartureAt: now })).toThrow();
});

test("waiting room runs all five groups manually, blocks double-clicks and stays complete", async ({ page }) => {
  await ready(page);
  await freeze(page);
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 1");
  await expect(page.locator("#ready-status")).toHaveText("KLAR TIL START");
  await expect(page.locator("#countdown")).toBeHidden();
  await page.clock.fastForward(600000);
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 1");
  await page.locator("#depart-group").dblclick({ delay: 50 });
  expect((await stored(page)).departures).toHaveLength(1);
  for (let group = 2; group <= 5; group++) {
    await expect(page.locator("#group-title")).toHaveText(`GRUPPE ${group}`);
    await expect(page.locator("#countdown")).toHaveText("05:00");
    await expect(page.locator("#depart-group")).toBeDisabled();
    await page.clock.fastForward(299000);
    await expect(page.locator("#countdown")).toHaveText("00:01");
    await page.clock.fastForward(1000);
    await expect(page.locator("#countdown")).toHaveText("00:00");
    await expect(page.locator("#ready-status")).toHaveText("KLAR TIL START");
    await expect(page.locator("#depart-group")).toBeEnabled();
    expect((await stored(page)).departures).toHaveLength(group - 1);
    await page.locator("#depart-group").click();
  }
  await expect(page.locator("#group-title")).toHaveText("ALLE GRUPPER ER SENDT UT");
  await expect(page.locator("#ready-status")).toHaveText("ETTERFORSKNINGEN PÅGÅR");
  await expect(page.locator("#depart-group")).toBeHidden();
  expect((await stored(page)).departures).toHaveLength(5);
  await page.clock.fastForward(3600000);
  await page.reload();
  await expect(page.locator("#group-title")).toHaveText("ALLE GRUPPER ER SENDT UT");
});

test("waiting-room countdown catches up after inactivity and restores the original deadline on reload", async ({ page }) => {
  await ready(page);
  await freeze(page);
  await page.locator("#depart-group").click();
  const target = (await stored(page)).nextDepartureAt;
  await page.clock.fastForward(123000);
  await expect(page.locator("#countdown")).toHaveText("02:57");
  await page.reload();
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 2");
  await expect(page.locator("#countdown")).toHaveText("02:57");
  expect((await stored(page)).nextDepartureAt).toBe(target);
  // Advancing wall time without ticking the interval models an inactive tab.
  await page.clock.setSystemTime(target + 60000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator("#countdown")).toHaveText("00:00");
  await expect(page.locator("#depart-group")).toBeEnabled();
  await page.reload();
  await expect(page.locator("#countdown")).toHaveText("00:00");
  expect((await stored(page)).departures).toHaveLength(1);
});

test("waiting-room settings lock during a sequence and early release and reset require confirmation", async ({ page }) => {
  await ready(page);
  await freeze(page);
  await settings(page);
  await expect(page.locator("#sound-enabled")).not.toBeChecked();
  await page.locator("#group-count").fill("3");
  await page.locator("#interval-minutes").fill("2");
  await page.getByRole("button", { name: "LAGRE INNSTILLINGER" }).click();
  await page.locator("#depart-group").click();
  await expect(page.locator("#countdown")).toHaveText("02:00");
  await settings(page);
  await expect(page.locator("#group-count")).toBeDisabled();
  await expect(page.locator("#interval-minutes")).toBeDisabled();
  await page.locator("#allow-early").click();
  await page.locator("#cancel-early").click();
  expect((await stored(page)).earlyAllowed).toBe(false);
  await page.locator("#allow-early").click();
  await page.locator("#confirm-early").click();
  await expect(page.locator("#ready-status")).toHaveText("TIDLIG UTSENDELSE TILLATT");
  await page.reload();
  await expect(page.locator("#depart-group")).toBeEnabled();
  await page.locator("#depart-group").dblclick({ delay: 50 });
  expect((await stored(page)).departures).toHaveLength(2);
  expect((await stored(page)).earlyAllowed).toBe(false);
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 3");
  await expect(page.locator("#depart-group")).toBeDisabled();
  await settings(page);
  await page.locator("#request-reset").click();
  await page.locator("#cancel-reset").click();
  expect((await stored(page)).departures).toHaveLength(2);
  await page.locator("#request-reset").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 1");
  await expect(page.locator("#countdown")).toBeHidden();
  expect((await stored(page)).settings).toEqual({ groupCount: 3, intervalMinutes: 2, soundEnabled: false });
  await page.clock.fastForward(600000);
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 1");
  await settings(page);
  await expect(page.locator("#group-count")).toBeEnabled();
});

test("waiting-room alert is off by default, opt-in and emitted only once per ready group", async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.__alertVoices = 0;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.__waitingAudio = this; }
      createOscillator() { window.__alertVoices++; return super.createOscillator(); }
    };
  });
  await ready(page);
  await freeze(page);
  await page.locator("#depart-group").click();
  await page.clock.fastForward(300000);
  expect(await page.evaluate(() => window.__alertVoices)).toBe(0);
  expect(await page.evaluate(() => Boolean(window.__waitingAudio))).toBe(false);
  await settings(page);
  await page.locator("#sound-enabled").check();
  await page.getByRole("button", { name: "LAGRE INNSTILLINGER" }).click();
  await expect.poll(() => page.evaluate(() => window.__waitingAudio?.state)).toBe("running");
  await page.locator("#depart-group").click();
  const target = (await stored(page)).nextDepartureAt;
  await settings(page);
  await page.getByRole("button", { name: "LAGRE INNSTILLINGER" }).click();
  expect((await stored(page)).nextDepartureAt).toBe(target);
  await expect.poll(() => page.evaluate(() => window.__waitingAudio?.state)).toBe("running");
  await page.clock.fastForward(300000);
  await expect.poll(() => page.evaluate(() => window.__alertVoices)).toBe(1);
  await page.clock.fastForward(60000);
  expect(await page.evaluate(() => window.__alertVoices)).toBe(1);
  await page.reload();
  expect(await page.evaluate(() => window.__alertVoices)).toBe(0);
  await expect(page.locator("#ready-status")).toHaveText("KLAR TIL START");
});

test("waiting-room and iPad caches, navigation and storage remain isolated offline", async ({ page, context }) => {
  await page.goto("./");
  await expect(page.locator("#offline-status")).toContainText("KLAR UTEN NETT");
  await page.locator("#open-case").click();
  await page.locator("#answer-0").fill("Ole Vik");
  await page.locator(".clue-card").first().getByRole("button").click();
  const ipadState = await page.evaluate(() => [localStorage.getItem("sak013.progress.v1"), localStorage.getItem("sak013.settings.v1")]);
  const room = await context.newPage();
  const requests = [];
  room.on("request", (request) => requests.push(request.url()));
  await ready(room, "venterom");
  await expect(room).toHaveURL(/\/halloween\/venterom\/$/);
  for (const spoiler of ["Ole Vik", "18.42", "Føynland", "IKKE SNU DEG", "OLE MAGNUS SVANEVIK"]) {
    await expect(room.locator("body")).not.toContainText(spoiler);
  }
  expect(requests.some((url) => url.includes("case.config.js"))).toBe(false);
  await room.locator("#depart-group").click();
  await settings(room);
  await room.locator("#request-reset").click();
  await room.locator("#confirm-reset").click();
  expect(await room.evaluate(() => [localStorage.getItem("sak013.progress.v1"), localStorage.getItem("sak013.settings.v1")])).toEqual(ipadState);
  const caches = await room.evaluate(() => window.caches.keys());
  expect(caches).toContain("blodlopet-venterom-cache-v1");
  expect(caches.some((key) => key.startsWith("sak013-"))).toBe(true);
  const registrations = await room.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((registration) => new URL(registration.scope).pathname));
  expect(registrations.sort()).toEqual(["/halloween/", "/halloween/venterom/"]);
  await context.setOffline(true);
  await room.reload();
  await expect(room.locator("#group-title")).toHaveText("GRUPPE 1");
  await expect(room.locator("#offline-status")).toHaveText("KLAR UTEN NETT");
  await expect(room.locator(".police-logo")).toHaveJSProperty("naturalWidth", 1999);
  await room.locator("#depart-group").click();
  await room.reload();
  await expect(room.locator("#group-title")).toHaveText("GRUPPE 2");
  await expect(room.locator("#depart-group")).toBeDisabled();
  await page.reload();
  await expect(page.locator("#investigation")).toBeVisible();
  await expect(page.locator("#solved-count")).toHaveText("1");
  await expect(page.locator("#answer-0")).toHaveAttribute("readonly", "");
});

test("waiting-room display is legible and fits 16:9 smartboards", async ({ page }) => {
  await ready(page);
  await page.screenshot({ path: "test-results/venterom-ready.png", fullPage: true });
  await page.locator("#depart-group").click();
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const countdown = await page.locator("#countdown").boundingBox();
    const button = await page.locator("#depart-group").boundingBox();
    const font = await page.locator("#countdown").evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(font).toBeGreaterThanOrEqual(160);
    expect(countdown.x).toBeGreaterThanOrEqual(0);
    expect(button.height).toBeGreaterThanOrEqual(80);
    expect(button.y + button.height).toBeLessThan(viewport.height - 65);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: "test-results/venterom-countdown.png", fullPage: true });
});

test("waiting-room storage failures are explicit and do not stop the display", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "blodlopet-venterom-v1") throw new Error("Storage blocked");
      return setItem.call(this, key, value);
    };
  });
  await ready(page);
  await page.locator("#depart-group").click();
  await expect(page.locator("#storage-warning")).toContainText("Fremdriften kan ikke lagres");
  await expect(page.locator("#group-title")).toHaveText("GRUPPE 2");
  await expect(page.locator("#depart-group")).toBeDisabled();
});
