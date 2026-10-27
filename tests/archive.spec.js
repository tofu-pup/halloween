import { test, expect } from "@playwright/test";
import { CASE_CONFIG } from "../case.config.js";

const answers = ["  ole VIK  ", "18:42", "Foynland", "  IKKE,   SNU DEG! "];
const spoilers = ["ole vik", "18.42", "føynland", "ikke snu deg", "ole magnus svanevik"];

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

test("archive loads with only local assets and caches the complete /halloween/ app", async ({ page, context }) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await ready(page);
  await expect(page).toHaveTitle("BLODLØPET – SAK 013");
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  expect(requests.every((url) => url.startsWith("http://127.0.0.1:4187/halloween/"))).toBe(true);
  expect(errors).toEqual([]);
  const cache = await page.evaluate(async () => {
    const key = (await caches.keys()).find((name) => name.startsWith("sak013-"));
    return (await (await caches.open(key)).keys()).map((entry) => new URL(entry.url).pathname);
  });
  expect(cache).toHaveLength(14);
  expect(cache).toContain("/halloween/case.config.js");
  expect(cache).toContain("/halloween/assets/icon-512.png");
  expect(cache).toContain("/halloween/assets/police-logo.png");
  expect(cache).toContain("/halloween/assets/bridge.png");
  await expect(page.locator(".bridge-photo")).toHaveAttribute("src", "./assets/bridge.png");
  expect(await page.locator(".bridge-photo").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator(".masthead .police-logo")).toBeVisible();
  expect(await page.locator(".masthead .police-logo").evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".bridge-photo")).toBeVisible();
  await expect(page.locator(".bridge-photo")).toHaveJSProperty("naturalWidth", 1134);
});

test("accepts Norwegian variants, rejects wrong and empty answers, preserves drafts and progress", async ({ page }) => {
  await ready(page);
  await page.locator("#open-case").click();
  await page.locator(".clue-card").first().getByRole("button").click();
  await expect(page.locator("#feedback-0")).toContainText("Skriv inn");
  await page.locator("#answer-0").fill("14");
  await page.locator(".clue-card").first().getByRole("button").click();
  await expect(page.locator("#answer-0")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#feedback-0")).toHaveText("Opplysningene stemmer ikke med arkivet. Undersøk sporene på nytt.");
  await page.locator("#answer-0").fill(" Ole Vik ");
  await page.locator(".clue-card").first().getByRole("button").click();
  await page.locator("#answer-1").fill("notat som ikke er sendt");
  await page.reload();
  await expect(page.locator("#investigation")).toBeVisible();
  await expect(page.locator("#solved-count")).toHaveText("1");
  await expect(page.locator("#answer-0")).toHaveAttribute("readonly", "");
  await expect(page.locator("#answer-0")).toHaveAttribute("type", "password");
  await expect(page.locator("#answer-1")).toHaveValue("notat som ikke er sendt");
  await expect(page.locator("#unlock-ready")).toBeHidden();
  expect(await page.evaluate(async () => {
    const { acceptsAnswer } = await import("./app.js");
    const { CASE_CONFIG } = await import("./case.config.js");
    const variants = [
      ["Ole Vik", "  OLE VIK  ", "ole   vik"],
      ["18.42", "18:42", "1842", " 18.42 "],
      ["Føynland", "Foynland", " FØYNLAND "],
      ["IKKE SNU DEG", "ikke snu deg", "  IKKE   SNU   DEG! ", "«Ikke snu deg.»", "IKKE—SNU—DEG", "IKKE,\nSNU\tDEG!!!"],
    ];
    const wrong = [
      ["13", "Ole", "Ole Vin", "Ole Magnus Svanevik"],
      ["18.43", "18:24", "184", "18/42", "18 42", "1842!"],
      ["broen", "Foynlan", "Nøtterøy"],
      ["SNU DEG", "IKKE SNU DERE", "IKKE"],
    ];
    return {
      accepted: variants.every((values, i) => values.every((value) => acceptsAnswer(value, CASE_CONFIG.clues[i]))),
      rejected: wrong.every((values, i) => values.every((value) => !acceptsAnswer(value, CASE_CONFIG.clues[i]))),
    };
  })).toEqual({ accepted: true, rejected: true });
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
  await expect(page.locator("#finale-identity")).toBeEmpty();
  await expect(page.locator("body")).not.toContainText("OLE MAGNUS SVANEVIK");
  await expect(page.locator(".person-record dd")).toHaveText(["OLE VIK", "13", "31.10.2001", "FORSVUNNET"], { timeout: 20000 });
  await expect(page.locator("#identity-connection p").last()).toHaveText("NY IDENTITET FUNNET", { timeout: 15000 });
  await expect(page.locator("#finale")).toBeVisible({ timeout: 90000 });
  await expect(page.locator("#finale-title")).toHaveText("SE BAK DERE");
  await expect(page.locator("#finale-identity")).toBeEmpty();
  await expect(page.locator("#finale-identity")).toHaveText("Ole Vik = OLE MAGNUS SVANEVIK", { timeout: 15000 });
  await page.screenshot({ path: "test-results/finale-ipad.png", fullPage: true });
  await page.reload();
  await expect(page.locator("#finale")).toBeVisible();
  await expect(page.locator("#finale-identity")).toHaveText("Ole Vik = OLE MAGNUS SVANEVIK");
  await supervisor(page);
  await page.locator("#request-reset").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#welcome")).toBeVisible();
  await expect(page.locator("#sound-toggle")).toHaveCount(0);
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
  await expect(page.locator(".person-record > div")).toHaveCount(4);
  await expect(page.locator(".person-record dd")).toHaveText(["OLE VIK", "13", "31.10.2001", "FORSVUNNET"]);
  await expect(page.locator("#revelation")).toContainText("KONFIDENSIELT – SAK 013");
  await expect(page.locator("#revelation-title")).toHaveText("SAVNET PERSON");
  await expect(page.locator("#identity-connection p")).toHaveText(["NYE OPPLYSNINGER – 2026", "OLE VIK", "NY IDENTITET FUNNET"]);
  await page.screenshot({ path: "test-results/case-file-ipad.png", fullPage: true });
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
  await expect(page.locator("#finale-identity")).toBeEmpty();
  await expect(page.locator("#story-text")).toBeEmpty();
  await expect(page.locator("#identity-connection")).toBeEmpty();
  await page.clock.runFor(10000);
  await expect(page.locator("#finale-identity")).toBeEmpty();
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

test("Safari audio session is configured before gesture-activated startup", async ({ page }) => {
  await page.addInitScript(() => {
    // Windows Playwright WebKit has no Web Audio; this checks startup ordering.
    const events = [];
    window.__audioStartup = events;
    let type = "auto";
    Object.defineProperty(navigator, "audioSession", {
      value: {
        get type() { return type; },
        set type(value) { type = value; events.push(["session", value]); },
      },
    });
    window.AudioContext = class {
      constructor() {
        this.state = "suspended";
        this.destination = {};
        events.push(["context", type]);
      }
      createGain() { return { connect() {}, gain: { setValueAtTime() {} } }; }
      addEventListener() {}
      resume() {
        events.push(["resume", type]);
        return new Promise(() => {});
      }
    };
  });
  await ready(page);
  expect(await page.evaluate(() => window.__audioStartup)).toEqual([]);
  await page.locator("#open-case").click();
  await expect(page.locator("#investigation")).toBeVisible();
  expect(await page.evaluate(() => window.__audioStartup)).toEqual([
    ["session", "playback"], ["context", "playback"], ["resume", "playback"],
  ]);
});

test("dark sound is enabled by default on the first gesture and works offline without a toggle", async ({ page, context }) => {
  await page.addInitScript(() => {
    if (!navigator.audioSession) Object.defineProperty(navigator, "audioSession", { value: { type: "auto" } });
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        const analyser = this.createAnalyser();
        analyser.fftSize = 2048;
        const probe = { context: this, analyser, master: null, voices: 0, peakRms: 0, midrangePeak: -Infinity, sessionType: navigator.audioSession.type };
        window.__soundProbe = probe;
        const samples = new Float32Array(analyser.fftSize);
        const spectrum = new Float32Array(analyser.frequencyBinCount);
        // Capture during playback, not after Playwright's click/assertion round trips.
        setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          probe.peakRms = Math.max(probe.peakRms, Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length));
          analyser.getFloatFrequencyData(spectrum);
          for (let i = 0; i < spectrum.length; i++) {
            const frequency = i * this.sampleRate / analyser.fftSize;
            if (frequency >= 160 && frequency <= 320) probe.midrangePeak = Math.max(probe.midrangePeak, spectrum[i]);
          }
        }, 16);
        const createGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = createGain();
          if (!probe.master) {
            probe.master = gain;
            const connect = gain.connect.bind(gain);
            gain.connect = (destination, ...options) => {
              if (destination === this.destination) {
                connect(analyser);
                return analyser.connect(destination, ...options);
              }
              return connect(destination, ...options);
            };
          }
          return gain;
        };
        const createOscillator = this.createOscillator.bind(this);
        this.createOscillator = () => {
          probe.voices++;
          return createOscillator();
        };
      }
    };
  });
  await ready(page);
  await context.setOffline(true);
  expect(await page.evaluate(() => window.__soundProbe)).toBeUndefined();
  await expect(page.getByRole("button", { name: /lyd/i })).toHaveCount(0);
  await page.locator("#open-case").click();
  await expect.poll(() => page.evaluate(() => window.__soundProbe.peakRms)).toBeGreaterThan(.02);
  await expect.poll(() => page.evaluate(() => window.__soundProbe.midrangePeak)).toBeGreaterThan(-35);
  const signal = await page.evaluate(() => {
    const probe = window.__soundProbe;
    return { peakRms: probe.peakRms, midrangePeak: probe.midrangePeak, state: probe.context.state };
  });
  expect(signal.state).toBe("running");
  expect(await page.evaluate(() => window.__soundProbe.sessionType)).toBe("playback");
  expect(signal.peakRms).toBeGreaterThan(.02);
  expect(signal.midrangePeak).toBeGreaterThan(-35);
  expect(await page.evaluate(() => window.__soundProbe.voices)).toBe(3);
  await page.locator("#answer-0").fill(answers[0]);
  await page.locator(".clue-card").first().getByRole("button").click();
  expect(await page.evaluate(() => window.__soundProbe.voices)).toBe(6);
  await supervisor(page);
  await page.locator("#request-reset").click();
  await page.locator("#confirm-reset").click();
  await expect(page.locator("#welcome")).toBeVisible();
  await page.waitForTimeout(100);
  const muted = await page.evaluate(() => {
    const samples = new Float32Array(window.__soundProbe.analyser.fftSize);
    window.__soundProbe.analyser.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  });
  expect(muted).toBeLessThan(.0001);
  await page.locator("#open-case").click();
  await expect.poll(() => page.evaluate(() => window.__soundProbe.voices)).toBe(9);
  await page.evaluate(() => window.__soundProbe.context.suspend());
  await expect(page.locator("#notice")).toContainText("satt lyden på pause");
  await page.locator("#answer-0").click();
  await expect.poll(() => page.evaluate(() => window.__soundProbe.context.state)).toBe("running");
});

test("audio startup failure reports the problem without blocking clue entry", async ({ page }) => {
  await page.addInitScript(() => {
    AudioContext.prototype.resume = () => Promise.reject(new Error("Audio blocked"));
  });
  await ready(page);
  await page.locator("#open-case").click();
  await expect(page.locator("#notice")).toContainText("Lyd kunne ikke startes");
  await expect(page.locator("#investigation")).toBeVisible();
  await expect(page.locator("#answer-0")).toBeEditable();
});

test("audio startup timeout releases the pending attempt and retries on the next tap", async ({ page }) => {
  await page.addInitScript(() => {
    const resume = AudioContext.prototype.resume;
    window.__resumeAttempts = 0;
    AudioContext.prototype.resume = function () {
      window.__resumeAttempts++;
      window.__audioContext = this;
      if (window.__resumeAttempts === 1) return new Promise(() => {});
      return resume.call(this);
    };
  });
  await ready(page);
  await page.clock.install();
  await page.locator("#open-case").click();
  await expect(page.locator("#investigation")).toBeVisible();
  await page.clock.fastForward(4100);
  await expect(page.locator("#notice")).toContainText("Lyd kunne ikke startes");
  await page.locator("#answer-0").click();
  await expect.poll(() => page.evaluate(() => window.__resumeAttempts)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__audioContext.state)).toBe("running");
  await page.locator("#answer-0").fill(answers[0]);
  await page.locator(".clue-card").first().getByRole("button").click();
  await expect(page.locator("#solved-count")).toHaveText("1");
});

test("mobile and iPad layouts fit without horizontal overflow", async ({ page }) => {
  await ready(page);
  await page.screenshot({ path: "test-results/welcome-ipad.png", fullPage: true, animations: "disabled" });
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1194, height: 834 }, { width: 1024, height: 768 }, { width: 1366, height: 1024 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 390) await page.screenshot({ path: "test-results/welcome-mobile.png", fullPage: true, animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const action = await page.locator("#open-case").boundingBox();
    await expect(page.locator("#open-case")).toHaveCSS("min-height", "88px");
    expect(Math.round(action.height)).toBeGreaterThanOrEqual(88);
    const fontSize = (selector) => page.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(await fontSize("#open-case")).toBeGreaterThanOrEqual(viewport.width >= 900 ? 28 : 22);
    await expect(page.locator(".hero-description")).toHaveCount(0);
    await expect(page.locator("#welcome")).not.toContainText("Fire poster");
    expect(await fontSize(".access-note")).toBeGreaterThanOrEqual(viewport.width >= 900 ? 15 : 14);
    expect(await fontSize(".meta-label")).toBeGreaterThanOrEqual(14);
    expect(await fontSize(".welcome-meta > div")).toBeGreaterThanOrEqual(viewport.width >= 900 ? 20 : 18);
    expect(await fontSize(".app-footer")).toBeGreaterThanOrEqual(viewport.width >= 900 ? 14 : 12);
    expect(await fontSize(".hero-lead")).toBeGreaterThanOrEqual(28);
    if (viewport.width >= 900) {
      expect(action.y + action.height).toBeLessThanOrEqual(viewport.height - 44);
      const evidence = await page.locator(".evidence-board").boundingBox();
      expect(evidence.width).toBeLessThan(action.width);
      expect(evidence.width).toBeLessThan(390);
    }
    await page.locator("#open-case").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator("#investigation aside")).toHaveCount(0);
    await expect(page.locator("#investigation")).not.toContainText("SAKSNOTAT");
    const clueList = await page.locator("#clue-list").boundingBox();
    const investigation = await page.locator("#investigation").boundingBox();
    expect(Math.round(clueList.width)).toBe(Math.round(investigation.width));
    expect(await fontSize(".clue-card label")).toBeGreaterThanOrEqual(24);
    expect(await fontSize(".answer-row button")).toBeGreaterThanOrEqual(18);
    const input = await page.locator("#answer-0").boundingBox();
    await expect(page.locator("#answer-0")).toHaveCSS("min-height", "60px");
    expect(Math.round(input.height)).toBeGreaterThanOrEqual(60);
    if (viewport.width === 1194) await page.screenshot({ path: "test-results/investigation-ipad.png", fullPage: true, animations: "disabled" });
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
  await expect(page.locator(".person-record > div")).toHaveCount(4);
  await expect(page.locator("#identity-connection p")).toHaveCount(3);
  await expect(page.locator("#revelation")).toBeVisible();
});

test("no solutions are supplied before all four posts are verified and every entry path is gated", async ({ page }) => {
  await ready(page);
  const noSpoilers = async () => {
    const content = (await page.locator("body").textContent()).toLocaleLowerCase("nb-NO");
    for (const spoiler of spoilers) expect(content).not.toContain(spoiler);
    await expect(page.locator("#revelation")).toBeHidden();
    await expect(page.locator("#finale")).toBeHidden();
  };
  await noSpoilers();
  await supervisor(page);
  await expect(page.locator("#skip-animation")).toBeDisabled();
  await expect(page.locator("#show-finale")).toBeDisabled();
  await page.locator("#supervisor-close").click();
  await page.locator("#open-case").click();
  for (let i = 0; i < 4; i++) {
    await page.locator(`#answer-${i}`).fill("ukjent");
    await page.locator(".clue-card").nth(i).getByRole("button").click();
    await expect(page.locator(`#feedback-${i}`)).toHaveText("Opplysningene stemmer ikke med arkivet. Undersøk sporene på nytt.");
    await noSpoilers();
    await expect(page.locator("#unlock-ready")).toBeHidden();
    if (i < 3) {
      await page.locator(`#answer-${i}`).fill(answers[i]);
      await page.locator(".clue-card").nth(i).getByRole("button").click();
      await expect(page.locator(`#answer-${i}`)).toHaveAttribute("type", "password");
    }
  }
  await page.locator("#unlock-case").evaluate((button) => button.click());
  await expect(page.locator("#investigation")).toBeVisible();
  await noSpoilers();
  await page.locator("#answer-3").fill(answers[3]);
  await page.locator(".clue-card").nth(3).getByRole("button").click();
  await expect(page.locator("#unlock-ready")).toContainText("ALLE FIRE SPOR BEKREFTET");
  await expect(page.locator("#unlock-ready")).toContainText("SAK 013 – TILGANG GODKJENT");
  await page.locator("#unlock-case").click();
  await expect(page.locator("#decryption")).toBeVisible();
});

test("old-story progress starts a fresh investigation", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("sak013.progress.v1", JSON.stringify({
      revision: "placeholder-1", screen: "finale", answers: ["13", "brua", "nokkel", "vent"], drafts: ["", "", "", ""],
    }));
  });
  await ready(page);
  await expect(page.locator("#welcome")).toBeVisible();
  await expect(page.locator("#solved-count")).toHaveText("0");
});

test("incomplete saved finale state cannot expose the secret file", async ({ page }) => {
  await page.addInitScript((revision) => {
    localStorage.setItem("sak013.progress.v1", JSON.stringify({
      revision, screen: "finale", answers: ["Ole Vik", "", "", ""], drafts: ["", "", "", ""], identityRevealed: true,
    }));
  }, CASE_CONFIG.revision);
  await ready(page);
  await expect(page.locator("#investigation")).toBeVisible();
  await expect(page.locator("#solved-count")).toHaveText("1");
  await expect(page.locator("#revelation")).toBeHidden();
  await expect(page.locator("#finale")).toBeHidden();
  await expect(page.locator("#finale-identity")).toBeEmpty();
});
