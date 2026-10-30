import { CASE_CONFIG as config } from "./case.config.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "sak013.progress.v1";
const SETTINGS_KEY = "sak013.settings.v1";
const screens = ["welcome", "investigation", "decryption", "revelation", "finale"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let runId = 0;
let audioContext;
let masterGain;
const activeTones = new Set();
let audioReady = false;
let audioStarting;
let noticeTimer;
let holdTimer;
let waitingForFinale = false;
let finalCountdownActive = false;
let settings = { manualFinale: false };
let state = freshState();

function freshState() {
  return { revision: config.revision, screen: "welcome", answers: config.clues.map(() => ""), drafts: config.clues.map(() => ""), identityRevealed: false };
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
    state.identityRevealed = state.screen === "finale" && saved.identityRevealed === true;
  } catch (error) {
    storageError(error);
  }
}

export function normalizeAnswer(value) {
  return value.toLocaleLowerCase("nb-NO").trim().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().replace(/\s+/g, " ");
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
  // Time separators are optional, but the four digits must be exact.
  if (clue.format === "time") return clue.answers.includes(value.trim());
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

function tone(frequency = 196, duration = 1.2, volume = .18, type = "triangle") {
  if (!audioReady || document.hidden || !audioContext || audioContext.state !== "running") return;
  const envelope = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const now = audioContext.currentTime;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(450, now + duration);
  filter.Q.value = .7;
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(volume, now + Math.min(.15, duration * .18));
  envelope.gain.exponentialRampToValueAtTime(volume * .65, now + duration * .45);
  envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
  filter.connect(envelope);
  envelope.connect(masterGain);

  // Slight beating and a quiet minor third make a dark, repeatable drone.
  const partials = [[1, .8], [1.012, .22], [1.1892, .14]];
  let remaining = partials.length;
  for (const [ratio, weight] of partials) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = ratio === 1 ? type : "sine";
    oscillator.frequency.setValueAtTime(frequency * ratio, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * ratio * .93, now + duration);
    gain.gain.value = weight;
    oscillator.connect(gain);
    gain.connect(filter);
    activeTones.add(oscillator);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
    oscillator.onended = () => {
      activeTones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
      if (--remaining === 0) { filter.disconnect(); envelope.disconnect(); }
    };
  }
}

function raceBeep(final = false) {
  if (!audioReady || document.hidden || audioContext?.state !== "running") return;
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;
  const duration = final ? .8 : .18;
  oscillator.type = "sine";
  oscillator.frequency.value = final ? 880 : 660;
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(.22, now + .01);
  envelope.gain.setValueAtTime(.22, now + duration - .04);
  envelope.gain.linearRampToValueAtTime(0, now + duration);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  activeTones.add(oscillator);
  oscillator.onended = () => {
    activeTones.delete(oscillator);
    oscillator.disconnect();
    envelope.disconnect();
  };
  oscillator.start(now);
  oscillator.stop(now + duration);
}

async function activateSound() {
  if (document.hidden) return false;
  if (audioReady && audioContext?.state === "running") return true;
  if (audioStarting) return audioStarting;
  audioStarting = (async () => {
    let timeout;
    try {
      // iOS otherwise uses the ambient channel, which Silent Mode can mute.
      if (navigator.audioSession) navigator.audioSession.type = "playback";
      if (!audioContext || audioContext.state === "closed") {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error("Web Audio støttes ikke.");
        audioContext = new Audio({ latencyHint: "interactive" });
        masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
        audioContext.addEventListener("statechange", checkSoundState);
      }
      await Promise.race([
        audioContext.resume(),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Lydoppstart tok for lang tid.")), 4000);
        }),
      ]);
      if (audioContext.state !== "running") throw new Error("Lyd ble ikke aktivert.");
      audioReady = true;
      masterGain.gain.setValueAtTime(.8, audioContext.currentTime);
      return true;
    } catch (error) {
      stopSound();
      console.warn("SAK 013: Lyd kunne ikke startes.", error);
      showNotice("Lyd kunne ikke startes. Den forsøkes startet ved neste trykk. Historien fungerer også uten lyd.");
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();
  try { return await audioStarting; }
  finally { audioStarting = undefined; }
}

function checkSoundState() {
  if (audioReady && !document.hidden && audioContext.state !== "running") {
    stopSound();
    showNotice("Nettleseren har satt lyden på pause. Lyden fortsetter ved neste trykk på skjermen.");
  }
}

function stopSound() {
  if (masterGain && audioContext) masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  for (const oscillator of activeTones) oscillator.stop();
  activeTones.clear();
  audioReady = false;
}

function showScreen(screen, focus = true) {
  if (screens.indexOf(screen) > 1 && !state.answers.every((answer, i) => acceptsAnswer(answer, config.clues[i]))) screen = "investigation";
  runId++;
  clearFinalCountdown();
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
    const heading = screen === "investigation" && state.answers.every(Boolean) ? $("unlock-title") : $(screen).querySelector("h1, h2");
    if (heading && !document.querySelector("dialog[open]")) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
  if (screen === "decryption") startDecryption(runId);
  if (screen === "revelation") startRevelation(runId);
  if (screen === "finale") startFinale(runId);
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
      // Do not display verified solutions to children still solving other posts.
      input.type = "password";
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
        tone([196, 220, 233.08, 261.63][index], 1.2, .17);
        const next = config.clues.findIndex((_, i) => !state.answers[i]);
        if (next >= 0) $(`answer-${next}`).focus();
        else $("unlock-case").focus();
      } else {
        form.classList.remove("error");
        void form.offsetWidth;
        form.classList.add("error");
        feedback.textContent = input.value.trim() ? "Opplysningene stemmer ikke med arkivet. Undersøk sporene på nytt." : "Skriv inn et svar fra denne posten først.";
        input.setAttribute("aria-invalid", "true");
        tone(185, .7, .14);
        input.focus();
      }
    });
    $("clue-list").append(form);
  });
  updateProgress();
}

function updateProgress() {
  const count = state.answers.filter(Boolean).length;
  const complete = count === config.clues.length;
  $("solved-count").textContent = String(count);
  $("clue-list").hidden = complete;
  $("investigation-heading").hidden = complete;
  $("unlock-ready").hidden = !complete;
  $("investigation").classList.toggle("ready-to-unlock", complete);
  $("investigation").setAttribute("aria-labelledby", complete ? "unlock-title" : "investigation-title");
  if (complete && state.screen === "investigation") window.scrollTo(0, 0);
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
    tone(step.tone, index >= 3 ? 2 : 1.2, .18);
    lastAt = step.at;
  }
  if (await delay(config.decryptionDuration - lastAt, token)) showScreen("revelation");
}

async function typeParagraph(element, text, token) {
  const characters = Array.from(text);
  element.classList.add("typing");
  if (reducedMotion.matches) {
    element.textContent = text;
    if (!await delay(Math.max(2500, characters.length * config.revelation.characterDelay), token)) return false;
  } else {
    // Small batches keep iPad DOM work modest without changing the reading pace.
    for (let i = 0; i < characters.length; i += 3) {
      if (!await delay(config.revelation.characterDelay * 3, token)) return false;
      element.textContent += characters.slice(i, i + 3).join("");
    }
  }
  element.classList.remove("typing");
  return true;
}

async function startRevelation(token) {
  $("revelation-title").textContent = config.revelation.title;
  $("story-text").replaceChildren();
  $("identity-connection").replaceChildren();
  $("revelation-warning").textContent = "";
  const fields = document.createElement("dl");
  fields.className = "person-record";
  $("story-text").append(fields);
  for (const field of config.revelation.fields) {
    const { row, value } = recordField(field);
    fields.append(row);
    if (!await typeParagraph(value, field.value, token)) return;
    row.scrollIntoView({ behavior: "auto", block: "nearest" });
    if (!await delay(config.revelation.paragraphPause, token)) return;
  }
  for (const text of config.revelation.connection) {
    const line = document.createElement("p");
    $("identity-connection").append(line);
    if (!await typeParagraph(line, text, token)) return;
    line.scrollIntoView({ behavior: "auto", block: "nearest" });
    tone(196, 1.4, .18);
    if (!await delay(config.revelation.paragraphPause, token)) return;
  }
  await finishReport(token);
}

function recordField(field) {
  const row = document.createElement("div");
  const label = document.createElement("dt");
  const value = document.createElement("dd");
  label.textContent = `${field.label}:`;
  row.append(label, value);
  return { row, value };
}

function completeReport() {
  $("story-text").replaceChildren();
  $("identity-connection").replaceChildren();
  const fields = document.createElement("dl");
  fields.className = "person-record";
  for (const field of config.revelation.fields) {
    const { row, value } = recordField(field);
    value.textContent = field.value;
    fields.append(row);
  }
  $("story-text").append(fields);
  for (const text of config.revelation.connection) {
    const line = document.createElement("p");
    line.textContent = text;
    $("identity-connection").append(line);
  }
}

async function startFinale(token) {
  $("finale-identity").textContent = "";
  tone(174.61, 3.5, .2);
  if (!state.identityRevealed) {
    if (!await delay(config.revelation.identityDelay, token)) return;
    if (!await typeParagraph($("finale-identity"), config.revelation.identity, token)) return;
    state.identityRevealed = true;
    save();
  } else {
    $("finale-identity").textContent = config.revelation.identity;
  }
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
  tone(185, 2.5, .18);
  if (!await delay(config.revelation.warningDuration, token)) return;
  if (!settings.manualFinale) startFinalCountdown(token);
}

function clearFinalCountdown() {
  finalCountdownActive = false;
}

async function startFinalCountdown(token) {
  finalCountdownActive = true;
  for (let cue = 0; cue < 3; cue++) {
    // Wait for a visible, unpaused frame before each cue, including manual starts.
    if (!await delay(0, token)) return;
    raceBeep();
    if (!await delay(config.revelation.countdownInterval, token)) return;
  }
  showScreen("finale");
  raceBeep(true);
}

function openSupervisor() {
  $("manual-finale").checked = settings.manualFinale;
  $("supervisor-dialog").showModal();
}

function closeSupervisor() {
  $("supervisor-dialog").close();
  const heading = state.screen === "investigation" && state.answers.every(Boolean) ? $("unlock-title") : $(state.screen).querySelector("h1, h2");
  if (heading) heading.focus({ preventScroll: true });
}

function skipAnimation() {
  const screen = state.screen;
  closeSupervisor();
  if (screen === "decryption") {
    showScreen("revelation");
  } else if (screen === "revelation") {
    const token = ++runId;
    clearFinalCountdown();
    completeReport();
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
  $("identity-connection").replaceChildren();
  $("finale-identity").textContent = "";
  $("revelation-title").textContent = "";
  $("terminal-log").textContent = "";
  $("revelation-warning").textContent = "";
  showScreen("welcome");
}

$("open-case").addEventListener("click", () => {
  const ready = activateSound();
  showScreen("investigation");
  const token = runId;
  ready.then((started) => { if (started && token === runId) tone(196, 1.8, .23); });
});
$("unlock-case").addEventListener("click", () => { if (state.answers.every(Boolean)) showScreen("decryption"); });
// Safari requires a real gesture; sound is enabled by default, not autoplayed.
document.addEventListener("click", () => { activateSound(); }, { capture: true });
document.addEventListener("keydown", (event) => {
  if (!event.repeat && (event.key === "Enter" || event.key === " ")) activateSound();
});
$("supervisor-open").addEventListener("click", openSupervisor);
$("supervisor-close").addEventListener("click", closeSupervisor);
$("skip-animation").addEventListener("click", skipAnimation);
$("show-finale").addEventListener("click", () => {
  closeSupervisor();
  clearFinalCountdown();
  completeReport();
  startFinalCountdown(++runId);
});
$("manual-finale").addEventListener("change", () => {
  settings.manualFinale = $("manual-finale").checked;
  save();
  if (state.screen === "revelation" && settings.manualFinale && finalCountdownActive) {
    runId++;
    clearFinalCountdown();
    $("revelation-warning").textContent = "Sluttrapporten er komplett.";
  }
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
  else {
    checkSoundState();
    if (audioReady && masterGain) masterGain.gain.setValueAtTime(.8, audioContext.currentTime);
  }
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
