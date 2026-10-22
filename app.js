import { CASE_CONFIG as config } from "./case.config.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "sak013.progress.v1";
const SETTINGS_KEY = "sak013.settings.v1";
const screens = ["welcome", "investigation", "decryption", "revelation", "finale"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let runId = 0;
let audioContext;
let masterGain;
let soundOn = false;
let noticeTimer;
let holdTimer;
let waitingForFinale = false;
let settings = { manualFinale: false };
let state = freshState();

function freshState() {
  return { revision: config.revision, screen: "welcome", answers: config.clues.map(() => ""), drafts: config.clues.map(() => "") };
}

function storageError(error) {
  console.warn("SAK 013: Lokal lagring er utilgjengelig.", error);
  $("storage-warning").hidden = false;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    $("storage-warning").hidden = true;
  } catch (error) {
    storageError(error);
  }
}

function restore() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    settings.manualFinale = savedSettings?.manualFinale === true;
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || saved.revision !== config.revision) return;
    if (!Array.isArray(saved.answers) || !Array.isArray(saved.drafts) || saved.answers.length !== config.clues.length || saved.drafts.length !== config.clues.length || !saved.answers.every((a) => typeof a === "string") || !saved.drafts.every((a) => typeof a === "string")) {
      throw new Error("Ugyldig lagret fremdrift.");
    }
    state.answers = saved.answers.map((answer, i) => acceptsAnswer(answer, config.clues[i]) ? answer : "");
    state.drafts = saved.drafts.map((answer) => answer.slice(0, 100));
    state.screen = screens.includes(saved.screen) ? saved.screen : "welcome";
    if (screens.indexOf(state.screen) > 1 && !state.answers.every(Boolean)) state.screen = "investigation";
  } catch (error) {
    storageError(error);
  }
}

export function normalizeAnswer(value) {
  return value.toLocaleLowerCase("nb-NO").trim().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ");
}

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

export function acceptsAnswer(value, clue) {
  const answer = normalizeAnswer(value);
  if (!answer) return false;
  return clue.answers.some((candidate) => {
    const accepted = normalizeAnswer(candidate);
    if (answer === accepted) return true;
    // Never fuzzy-match numbers or very short answers.
    return accepted.length >= 4 && !/\d/.test(accepted + answer) && editDistance(answer, accepted) <= clue.maxTypos;
  });
}

function showNotice(message) {
  clearTimeout(noticeTimer);
  $("notice").textContent = message;
  $("notice").hidden = false;
  noticeTimer = setTimeout(() => { $("notice").hidden = true; }, 5500);
}

function tone(frequency = 110, duration = .3, volume = .15, type = "sine") {
  if (!soundOn || !audioContext || audioContext.state !== "running") return;
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * .73, now + duration);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(volume, now + .025);
  envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + .02);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}

async function toggleSound() {
  if (soundOn) {
    soundOn = false;
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  } else {
    try {
      if (!audioContext) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error("Web Audio støttes ikke.");
        audioContext = new Audio();
        masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
      }
      await audioContext.resume();
      if (audioContext.state !== "running") throw new Error("Lyd ble ikke aktivert.");
      soundOn = true;
      masterGain.gain.setValueAtTime(.6, audioContext.currentTime);
      tone(220, .25, .12);
    } catch (error) {
      console.warn("SAK 013: Lyd kunne ikke startes.", error);
      showNotice("Lyd kunne ikke startes. Trykk på lydknappen igjen. Historien fungerer også uten lyd.");
    }
  }
  $("sound-toggle").setAttribute("aria-pressed", String(soundOn));
  $("sound-toggle").setAttribute("aria-label", soundOn ? "Slå av lyd" : "Slå på lyd");
  $("sound-label").textContent = soundOn ? "LYD PÅ" : "LYD AV";
}

function stopSound() {
  if (masterGain && audioContext) masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  soundOn = false;
  $("sound-toggle").setAttribute("aria-pressed", "false");
  $("sound-toggle").setAttribute("aria-label", "Slå på lyd");
  $("sound-label").textContent = "LYD AV";
}

function showScreen(screen, focus = true) {
  runId++;
  waitingForFinale = false;
  state.screen = screen;
  for (const id of screens) $(id).hidden = id !== screen;
  document.body.classList.toggle("finale-active", screen === "finale");
  $("decryption").classList.remove("glitch");
  const labels = { welcome: "ARKIVET", investigation: "BEVISMATERIALE", decryption: "DEKRYPTERING", revelation: "SLUTTRAPPORT", finale: "013" };
  $("footer-section").textContent = labels[screen];
  $("skip-animation").disabled = !["decryption", "revelation"].includes(screen);
  $("show-finale").disabled = screen !== "revelation";
  save();
  if (focus) {
    window.scrollTo(0, 0);
    const heading = $(screen).querySelector("h1, h2");
    if (heading && !document.querySelector("dialog[open]")) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
  if (screen === "decryption") startDecryption(runId);
  if (screen === "revelation") startRevelation(runId);
  if (screen === "finale") tone(42, 2.8, .28, "triangle");
}

function renderClues() {
  $("clue-list").replaceChildren();
  config.clues.forEach((clue, index) => {
    const form = document.createElement("form");
    form.className = `clue-card${state.answers[index] ? " solved" : ""}`;
    form.noValidate = true;
    form.innerHTML = `<div class="clue-card-top"><span class="clue-number"></span><span class="clue-category"></span><span class="clue-state"></span></div><label></label><div class="answer-row"><input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="100"><button type="submit">BEKREFT ↗</button></div><p class="answer-feedback" aria-live="polite"></p>`;
    form.querySelector(".clue-number").textContent = `SPOR 0${index + 1}`;
    form.querySelector(".clue-category").textContent = clue.title.toLocaleUpperCase("nb-NO");
    const label = form.querySelector("label");
    label.textContent = clue.question;
    label.htmlFor = `answer-${index}`;
    const input = form.querySelector("input");
    input.id = `answer-${index}`;
    input.name = `spor-${index + 1}`;
    input.placeholder = "Skriv svaret deres …";
    input.value = state.answers[index] || state.drafts[index];
    input.setAttribute("aria-describedby", `feedback-${index}`);
    const feedback = form.querySelector(".answer-feedback");
    feedback.id = `feedback-${index}`;
    const updateSolved = () => {
      form.classList.add("solved");
      form.classList.remove("error");
      form.querySelector(".clue-state").textContent = "✓ BEKREFTET";
      input.readOnly = true;
      input.removeAttribute("aria-invalid");
      form.querySelector("button").hidden = true;
      feedback.textContent = clue.success;
    };
    form.querySelector(".clue-state").textContent = "LÅST";
    if (state.answers[index]) updateSolved();
    input.addEventListener("input", () => {
      state.drafts[index] = input.value;
      input.removeAttribute("aria-invalid");
      form.classList.remove("error");
      feedback.textContent = "";
      save();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.answers[index]) return;
      if (acceptsAnswer(input.value, clue)) {
        state.answers[index] = input.value.trim();
        state.drafts[index] = "";
        save();
        updateSolved();
        updateProgress();
        tone(285 + index * 35, .45, .13, "triangle");
        const next = config.clues.findIndex((_, i) => !state.answers[i]);
        if (next >= 0) $(`answer-${next}`).focus();
        else $("unlock-case").focus();
      } else {
        form.classList.remove("error");
        void form.offsetWidth;
        form.classList.add("error");
        feedback.textContent = input.value.trim() ? "Ikke helt. Se på notatene deres og prøv igjen." : "Skriv inn et svar fra denne posten først.";
        input.setAttribute("aria-invalid", "true");
        tone(85, .2, .08);
        input.focus();
      }
    });
    $("clue-list").append(form);
  });
  updateProgress();
}

function updateProgress() {
  const count = state.answers.filter(Boolean).length;
  $("solved-count").textContent = String(count);
  $("unlock-ready").hidden = count !== config.clues.length;
}

// A suspended/background tab must not silently advance to the live scare.
// All scripted time advances only while the document is visible and dialogs are closed.
function delay(milliseconds, token) {
  return new Promise((resolve) => {
    let elapsed = 0;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (token !== runId) {
        clearInterval(timer);
        resolve(false);
        return;
      }
      if (!document.hidden && !document.querySelector("dialog[open]")) elapsed += Math.min(now - previous, 150);
      previous = now;
      if (elapsed >= milliseconds) {
        clearInterval(timer);
        resolve(true);
      }
    }, 50);
  });
}

async function startDecryption(token) {
  $("terminal-log").textContent = "";
  $("decrypt-progress").style.width = "0%";
  let lastAt = 0;
  for (const [index, step] of config.decryption.entries()) {
    if (step.at > lastAt && !await delay(step.at - lastAt, token)) return;
    if (token !== runId) return;
    $("decrypt-message").textContent = step.message;
    $("decrypt-progress").style.width = `${step.progress}%`;
    $("decrypt-progress").parentElement.setAttribute("aria-valuenow", String(step.progress));
    $("terminal-log").textContent = config.decryption.slice(Math.max(0, index - 2), index + 1).map((entry) => entry.log).join("\n");
    $("decryption").classList.toggle("glitch", index >= 3 && index % 2 === 1);
    tone(step.tone, index >= 3 ? 1.5 : .5, .15, "triangle");
    lastAt = step.at;
  }
  if (await delay(config.decryptionDuration - lastAt, token)) showScreen("revelation");
}

async function typeParagraph(element, text, token) {
  element.classList.add("typing");
  if (reducedMotion.matches) {
    element.textContent = text;
    if (!await delay(Math.max(2500, text.length * config.revelation.characterDelay), token)) return false;
  } else {
    // Small batches keep iPad DOM work modest without changing the reading pace.
    for (let i = 0; i < text.length; i += 3) {
      if (!await delay(config.revelation.characterDelay * 3, token)) return false;
      element.textContent += text.slice(i, i + 3);
    }
  }
  element.classList.remove("typing");
  return true;
}

async function startRevelation(token) {
  $("revelation-title").textContent = config.revelation.title;
  $("story-text").replaceChildren();
  $("revelation-warning").textContent = "";
  for (const text of config.revelation.paragraphs) {
    const paragraph = document.createElement("p");
    $("story-text").append(paragraph);
    if (!await typeParagraph(paragraph, text, token)) return;
    paragraph.scrollIntoView({ behavior: "auto", block: "nearest" });
    if (!await delay(config.revelation.paragraphPause, token)) return;
  }
  await finishReport(token);
}

async function finishReport(token) {
  waitingForFinale = true;
  if (settings.manualFinale) {
    $("revelation-warning").textContent = "Sluttrapporten er komplett.";
    return;
  }
  if (!await delay(config.revelation.finalHold, token)) return;
  if (settings.manualFinale) return;
  $("revelation-warning").textContent = config.revelation.warning;
  tone(62, 2, .12, "triangle");
  if (!await delay(config.revelation.warningDuration, token)) return;
  if (!settings.manualFinale) showScreen("finale");
}

function openSupervisor() {
  $("manual-finale").checked = settings.manualFinale;
  $("supervisor-dialog").showModal();
}

function closeSupervisor() {
  $("supervisor-dialog").close();
  const heading = $(state.screen).querySelector("h1, h2");
  if (heading) heading.focus({ preventScroll: true });
}

function skipAnimation() {
  const screen = state.screen;
  closeSupervisor();
  if (screen === "decryption") {
    showScreen("revelation");
  } else if (screen === "revelation") {
    const token = ++runId;
    $("story-text").replaceChildren();
    for (const text of config.revelation.paragraphs) {
      const p = document.createElement("p");
      p.textContent = text;
      $("story-text").append(p);
    }
    finishReport(token);
  }
}

function resetCase() {
  runId++;
  clearTimeout(holdTimer);
  clearTimeout(noticeTimer);
  $("notice").hidden = true;
  $("reset-dialog").close();
  stopSound();
  state = freshState();
  // The adult's manual-cue preference is intentionally retained between groups.
  save();
  renderClues();
  $("story-text").replaceChildren();
  $("terminal-log").textContent = "";
  $("revelation-warning").textContent = "";
  showScreen("welcome");
}

$("open-case").addEventListener("click", () => { tone(140, .35); showScreen("investigation"); });
$("unlock-case").addEventListener("click", () => { if (state.answers.every(Boolean)) showScreen("decryption"); });
$("sound-toggle").addEventListener("click", toggleSound);
$("supervisor-open").addEventListener("click", openSupervisor);
$("supervisor-close").addEventListener("click", closeSupervisor);
$("skip-animation").addEventListener("click", skipAnimation);
$("show-finale").addEventListener("click", () => { closeSupervisor(); showScreen("finale"); });
$("manual-finale").addEventListener("change", () => {
  settings.manualFinale = $("manual-finale").checked;
  save();
  if (state.screen === "revelation" && waitingForFinale && !settings.manualFinale) finishReport(++runId);
});
$("request-reset").addEventListener("click", () => { $("supervisor-dialog").close(); $("reset-dialog").showModal(); });
$("cancel-reset").addEventListener("click", () => { $("reset-dialog").close(); openSupervisor(); });
$("confirm-reset").addEventListener("click", resetCase);
$("case-reset").addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  holdTimer = setTimeout(openSupervisor, 1800);
});
for (const event of ["pointerup", "pointercancel", "pointerleave"]) $("case-reset").addEventListener(event, () => clearTimeout(holdTimer));
$("case-reset").addEventListener("contextmenu", (event) => event.preventDefault());
$("case-reset").addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); holdTimer = setTimeout(openSupervisor, 1800); }
});
$("case-reset").addEventListener("keyup", () => clearTimeout(holdTimer));
$("case-reset").addEventListener("blur", () => clearTimeout(holdTimer));

$("fullscreen-toggle").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else showNotice("På iPad: bruk Del → Legg til på Hjem-skjerm for å åpne saksmappen uten nettleserramme.");
  } catch (error) {
    console.warn("SAK 013: Fullskjerm er utilgjengelig.", error);
    showNotice("Fullskjerm er ikke tilgjengelig her. På iPad kan dere legge appen til på Hjem-skjermen.");
  }
});
document.addEventListener("fullscreenchange", () => {
  $("fullscreen-toggle").setAttribute("aria-label", document.fullscreenElement ? "Avslutt fullskjerm" : "Åpne fullskjerm");
});
document.addEventListener("visibilitychange", () => {
  clearTimeout(holdTimer);
  if (document.hidden && masterGain) masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  else if (soundOn && masterGain) masterGain.gain.setValueAtTime(.6, audioContext.currentTime);
});
window.addEventListener("pagehide", save);

async function prepareOffline() {
  const report = (ready, detail) => {
    $("offline-status").className = `offline-status ${ready ? "ready" : "error"}`;
    $("offline-status").replaceChildren();
    $("offline-status").append(document.createElement("i"), document.createTextNode(ready ? "KLAR UTEN NETT" : "FRAKOBLET IKKE KLAR"));
    $("supervisor-offline").textContent = detail;
  };
  if (!("serviceWorker" in navigator)) {
    report(false, "Frakoblet modus er ikke tilgjengelig. Bruk Safari/Chrome via HTTPS eller localhost, ikke en lokal fil.");
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    const ready = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Service worker ble ikke klar. Kontroller at alle appfiler er publisert.")), 20000);
      navigator.serviceWorker.ready.then((worker) => {
        clearTimeout(timeout);
        resolve(worker);
      }, (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    const channel = new MessageChannel();
    const cached = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Frakoblet kontroll tok for lang tid.")), 12000);
      channel.port1.onmessage = (event) => { clearTimeout(timeout); channel.port1.close(); resolve(event.data?.ready === true); };
      ready.active.postMessage({ type: "CHECK_OFFLINE" }, [channel.port2]);
    });
    if (!cached) throw new Error("En eller flere filer mangler i hurtigbufferen.");
    report(true, "Alle appfiler er lagret på denne enheten. Prøv en full gjennomspilling i flymodus før arrangementet. Safari kan fjerne lagrede data ved lite lagringsplass.");
    if (registration.waiting) $("supervisor-offline").textContent += " En oppdatering venter. Lukk alle faner med appen og åpne på nytt når gruppen er ferdig.";
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) $("supervisor-offline").textContent += " Oppdatering klar: lukk alle appfaner mellom gruppene for å ta den i bruk.";
      });
    });
  } catch (error) {
    console.error("SAK 013: Frakoblet klargjøring mislyktes.", error);
    report(false, "Appen er ikke bekreftet klar uten nett. Koble til internett og last siden på nytt. Kontroller at nettstedet bruker HTTPS og at nettleseren tillater lokal lagring.");
  }
}

restore();
renderClues();
$("manual-finale").checked = settings.manualFinale;
showScreen(state.screen, false);
prepareOffline();
