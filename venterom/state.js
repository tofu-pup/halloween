export const STORAGE_KEY = "blodlopet-venterom-v1";
export const DEFAULT_SETTINGS = { groupCount: 5, intervalMinutes: 5, soundEnabled: false };

export function freshState(settings = DEFAULT_SETTINGS) {
  return {
    version: 1,
    settings: { ...settings },
    departures: [],
    nextDepartureAt: null,
    earlyAllowed: false,
    readyAnnounced: false,
  };
}

export function validateSettings(settings) {
  if (!settings || !Number.isSafeInteger(settings.groupCount) || settings.groupCount < 1) {
    throw new Error("Antall grupper må være et helt tall større enn null.");
  }
  if (!Number.isSafeInteger(settings.intervalMinutes) || settings.intervalMinutes < 1 || !Number.isSafeInteger(Date.now() + settings.intervalMinutes * 60000)) {
    throw new Error("Intervallet må være et gyldig, helt antall minutter større enn null.");
  }
  if (typeof settings.soundEnabled !== "boolean") throw new Error("Ugyldig lydinnstilling.");
}

export function restoreState(saved) {
  if (!saved || saved.version !== 1) throw new Error("Ukjent format på lagrede venteromsdata.");
  validateSettings(saved.settings);
  if (!Array.isArray(saved.departures) || saved.departures.length > saved.settings.groupCount ||
      !saved.departures.every((time) => Number.isSafeInteger(time) && time >= 0) ||
      typeof saved.earlyAllowed !== "boolean" || typeof saved.readyAnnounced !== "boolean") {
    throw new Error("Lagrede utsendelser er ugyldige.");
  }
  const counting = saved.departures.length > 0 && saved.departures.length < saved.settings.groupCount;
  if (counting) {
    const expected = saved.departures.at(-1) + saved.settings.intervalMinutes * 60000;
    if (!Number.isSafeInteger(saved.nextDepartureAt) || saved.nextDepartureAt !== expected) {
      throw new Error("Den lagrede nedtellingen er ugyldig.");
    }
  } else if (saved.nextDepartureAt !== null || saved.earlyAllowed || saved.readyAnnounced) {
    throw new Error("Lagret gruppestatus er ugyldig.");
  }
  return saved;
}

export function remainingTime(state, now = Date.now()) {
  return state.nextDepartureAt === null ? 0 : Math.max(0, state.nextDepartureAt - now);
}

export function departGroup(state, now = Date.now()) {
  if (state.departures.length >= state.settings.groupCount) throw new Error("Alle gruppene er allerede sendt ut.");
  if (remainingTime(state, now) > 0 && !state.earlyAllowed) throw new Error("Vent til nedtellingen er ferdig.");
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Enhetens klokke er ugyldig.");
  const departures = [...state.departures, now];
  const complete = departures.length === state.settings.groupCount;
  const nextDepartureAt = complete ? null : now + state.settings.intervalMinutes * 60000;
  if (nextDepartureAt !== null && !Number.isSafeInteger(nextDepartureAt)) throw new Error("Intervallet er for stort.");
  return { ...state, departures, nextDepartureAt, earlyAllowed: false, readyAnnounced: false };
}

export function formatTime(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
