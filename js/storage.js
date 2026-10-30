// Saves the child's progress in this browser only (localStorage). Nothing leaves the device.
const KEY = 'magicHomeTour.save.v1';

function fresh() {
  return {
    version: 1,
    lang: null,
    coins: 0,
    xp: 0,
    rooms: {},        // roomId -> { unlocked, stars, best }
    wrong: {},        // questionId -> times answered wrong (used by the revision room later)
    seen: {},         // questionId -> times shown
    settings: { lowGraphics: null, sound: true },
    streak: { count: 0, last: null },   // days in a row
    surpriseDay: {},  // roomId -> date of today's free surprise
    owned: [],        // shop items bought
    costume: {},      // { hat, glasses, shirt } item ids being worn
    stats: {},        // counters used for badges (correct, treats, kittens …)
    badges: [],       // badge ids earned
    stickers: [],     // sticker ids collected
  };
}

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const base = fresh();
      return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
    }
  } catch (e) {
    console.warn('Could not read saved progress, starting fresh.', e);
  }
  return fresh();
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); }
  catch (e) { console.warn('Could not save progress.', e); }
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function roomState(id) {
  if (!save.rooms[id]) save.rooms[id] = { unlocked: false, stars: 0, best: 0 };
  return save.rooms[id];
}

// today's date on this device, like "2026-10-30"
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA');
}
