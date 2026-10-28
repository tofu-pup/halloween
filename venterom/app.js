import { STORAGE_KEY, freshState, restoreState, validateSettings, remainingTime, departGroup, formatTime } from "./state.js";

const $ = (id) => document.getElementById(id);
let state = freshState();
let audio;
let audioStarting;
let alertTone;
let noticeTimer;
let lastPhase;

function notice(message) {
  clearTimeout(noticeTimer);
  $("notice").textContent = message;
  $("notice").hidden = false;
  noticeTimer = setTimeout(() => { $("notice").hidden = true; }, 7000);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("storage-warning").hidden = true;
  } catch (error) {
    console.warn("BLODLØPET venterom: Kunne ikke lagre utsendelsene.", error);
    $("storage-warning").textContent = "Fremdriften kan ikke lagres. Ikke oppdater eller lukk venterommet før alle grupper er sendt ut.";
    $("storage-warning").hidden = false;
  }
}

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) state = restoreState(JSON.parse(saved));
} catch (error) {
  console.warn("BLODLØPET venterom: Kunne ikke gjenopprette utsendelsene.", error);
  $("storage-warning").textContent = "Lagrede venteromsdata kunne ikke leses. En ny sekvens vises. Kontroller gruppestatus før dere fortsetter.";
  $("storage-warning").hidden = false;
}

async function activateSound() {
  if (!state.settings.soundEnabled || document.hidden) return false;
  if (audio?.state === "running") return true;
  if (audioStarting) return audioStarting;
  audioStarting = (async () => {
    let timeout;
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
      if (!audio || audio.state === "closed") {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error("Web Audio støttes ikke.");
        audio = new Audio();
      }
      await Promise.race([
        audio.resume(),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Lydoppstart tok for lang tid.")), 4000);
        }),
      ]);
      if (audio.state !== "running") throw new Error("Lyd ble ikke aktivert.");
      return true;
    } catch (error) {
      console.warn("BLODLØPET venterom: Lyd kunne ikke startes.", error);
      notice("Lyd kunne ikke startes. Prøv et nytt trykk og kontroller medievolumet. Nedtellingen fortsetter uten lyd.");
      return false;
    } finally { clearTimeout(timeout); }
  })();
  try { return await audioStarting; }
  finally { audioStarting = undefined; }
}

function stopAlert() {
  if (alertTone) alertTone.stop();
  alertTone = undefined;
}

function playAlert() {
  if (!state.settings.soundEnabled || audio?.state !== "running" || document.hidden) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.value = 392;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(.12, now + .025);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .5);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  alertTone = oscillator;
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
    if (alertTone === oscillator) alertTone = undefined;
  };
  oscillator.start(now);
  oscillator.stop(now + .52);
}

function render() {
  const now = Date.now();
  const complete = state.departures.length === state.settings.groupCount;
  const group = state.departures.length + 1;
  const remaining = remainingTime(state, now);
  const waiting = remaining > 0;
  const phase = complete ? "complete" : waiting ? state.earlyAllowed ? "early" : "countdown" : "ready";
  if (state.nextDepartureAt !== null && !waiting && !state.readyAnnounced) {
    state.readyAnnounced = true;
    save();
    playAlert();
  }
  document.body.dataset.phase = phase;
  $("group-label").textContent = complete ? "UTSENDELSER FULLFØRT" : "NESTE GRUPPE";
  $("group-title").textContent = complete ? "ALLE GRUPPER ER SENDT UT" : `GRUPPE ${group}`;
  $("countdown").hidden = state.nextDepartureAt === null;
  const time = formatTime(remaining);
  if ($("countdown").textContent !== time) $("countdown").textContent = time;
  $("ready-status").textContent = complete ? "ETTERFORSKNINGEN PÅGÅR" : phase === "early" ? "TIDLIG UTSENDELSE TILLATT" : waiting ? "TID TIL NESTE UTSENDELSE" : "KLAR TIL START";
  $("depart-group").hidden = complete;
  $("depart-group").disabled = complete || (waiting && !state.earlyAllowed);
  $("depart-group").firstChild.textContent = `SEND UT GRUPPE ${group} `;
  $("departure-count").textContent = `${state.departures.length} AV ${state.settings.groupCount} GRUPPER SENDT UT`;
  $("countdown-progress").style.width = `${complete ? 100 : state.nextDepartureAt === null ? 0 : Math.min(100, Math.max(0, 100 * (1 - remaining / (state.settings.intervalMinutes * 60000))))}%`;
  $("allow-early").disabled = !waiting || complete || state.earlyAllowed;
  if (lastPhase !== `${phase}:${group}`) {
    $("announcement").textContent = complete ? "Alle grupper er sendt ut." : phase === "ready" ? `Gruppe ${group} er klar til start.` : phase === "early" ? `Tidligere utsendelse er tillatt for gruppe ${group}.` : `Neste gruppe er gruppe ${group}.`;
    lastPhase = `${phase}:${group}`;
  }
}

function openSettings() {
  const started = state.departures.length > 0;
  $("group-count").value = state.settings.groupCount;
  $("interval-minutes").value = state.settings.intervalMinutes;
  $("group-count").disabled = started;
  $("interval-minutes").disabled = started;
  $("sound-enabled").checked = state.settings.soundEnabled;
  $("settings-lock").textContent = started ? "Antall grupper og intervall er låst. Nullstill utsendelsene for å endre dem." : "Antall grupper og intervall kan endres før første utsendelse.";
  $("settings-error").hidden = true;
  render();
  $("settings-dialog").showModal();
}

$("depart-group").addEventListener("click", () => {
  // The disabled state and timestamp guard also reject queued double-clicks.
  if ($("depart-group").disabled || state.departures.length === state.settings.groupCount ||
      (remainingTime(state) > 0 && !state.earlyAllowed)) return;
  try {
    state = departGroup(state);
    save();
    render();
  } catch (error) {
    console.warn("BLODLØPET venterom: Gruppen kunne ikke sendes ut.", error);
    notice(error.message);
  }
});
$("settings-open").addEventListener("click", openSettings);
$("settings-close").addEventListener("click", () => $("settings-dialog").close());
$("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const settings = state.departures.length ? { ...state.settings } : {
    groupCount: Number($("group-count").value),
    intervalMinutes: Number($("interval-minutes").value),
  };
  settings.soundEnabled = $("sound-enabled").checked;
  try {
    validateSettings(settings);
    state.settings = settings;
    if (settings.soundEnabled) activateSound();
    else stopAlert();
    save();
    render();
    $("settings-dialog").close();
  } catch (error) {
    console.warn("BLODLØPET venterom: Ugyldige innstillinger.", error);
    $("settings-error").textContent = error.message;
    $("settings-error").hidden = false;
  }
});
$("allow-early").addEventListener("click", () => {
  if ($("allow-early").disabled) return;
  $("early-title").textContent = `Tillate tidligere utsendelse av gruppe ${state.departures.length + 1}?`;
  $("early-dialog").showModal();
});
$("cancel-early").addEventListener("click", () => $("early-dialog").close());
$("confirm-early").addEventListener("click", () => {
  if (state.nextDepartureAt !== null && remainingTime(state) > 0) {
    state.earlyAllowed = true;
    save();
  }
  $("early-dialog").close();
  $("settings-dialog").close();
  render();
});
$("request-reset").addEventListener("click", () => $("reset-dialog").showModal());
$("cancel-reset").addEventListener("click", () => $("reset-dialog").close());
$("confirm-reset").addEventListener("click", () => {
  stopAlert();
  state = freshState(state.settings);
  save();
  $("reset-dialog").close();
  $("settings-dialog").close();
  render();
});
$("fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notice("Bruk nettleserens fullskjermvalg, for eksempel F11 på Windows.");
  } catch (error) {
    console.warn("BLODLØPET venterom: Fullskjerm er utilgjengelig.", error);
    notice("Fullskjerm kunne ikke åpnes. Bruk nettleserens fullskjermvalg.");
  }
});
document.addEventListener("click", () => { if (state.settings.soundEnabled) activateSound(); }, { capture: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAlert();
  else render();
});
window.addEventListener("pageshow", render);

async function prepareOffline() {
  try {
    if (!("serviceWorker" in navigator)) throw new Error("Service worker er ikke tilgjengelig.");
    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    const worker = registration.active || registration.installing || registration.waiting;
    if (!worker) throw new Error("Frakoblet motor mangler.");
    await new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", check);
        if (error) reject(error); else resolve();
      };
      const check = () => {
        if (worker.state === "activated") finish();
        else if (worker.state === "redundant") finish(new Error("Nedlastingen av frakoblede filer mislyktes."));
      };
      const timeout = setTimeout(() => finish(new Error("Frakoblet klargjøring tok for lang tid.")), 20000);
      worker.addEventListener("statechange", check);
      check();
    });
    const channel = new MessageChannel();
    const ready = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error("Kontrollen av frakoblede filer tok for lang tid.")); }, 12000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data?.ready === true);
      };
      worker.postMessage({ type: "CHECK_WAITING_ROOM_OFFLINE" }, [channel.port2]);
    });
    if (!ready) throw new Error("En eller flere venteromsfiler mangler.");
    $("offline-status").textContent = "KLAR UTEN NETT";
    $("offline-status").dataset.ready = "true";
    $("offline-help").textContent = "Alle venteromsfiler er lagret. Test en oppdatering uten nett før arrangementet. Bruk ett venteromsvindu og la enhetens klokke stå uendret.";
    $("update-notice").hidden = !registration.waiting;
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed" && registration.waiting) $("update-notice").hidden = false;
      });
    });
  } catch (error) {
    console.warn("BLODLØPET venterom: Frakoblet klargjøring mislyktes.", error);
    $("offline-status").textContent = "FRAKOBLET IKKE KLAR";
    $("offline-status").dataset.ready = "false";
    $("offline-help").textContent = `${error.message} Bruk HTTPS eller localhost og åpne siden på nett før arrangementet.`;
  }
}

render();
setInterval(render, 250);
prepareOffline();
