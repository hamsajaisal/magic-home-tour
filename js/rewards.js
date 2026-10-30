// Coins, counters, badges, stickers and the daily streak.
import { SETTINGS } from '../settings.js';
import { save, persist, today, roomState } from './storage.js';
import { t, pick } from './i18n.js';
import { play } from './audio.js';

export const catalog = { items: [], badges: [], stickers: [], rooms: [] };
let toast = () => {};
let onChange = () => {};

export async function loadCatalog(rooms, { showToast, changed }) {
  const [shop, badges] = await Promise.all([
    fetch('data/shop.json').then((r) => r.json()),
    fetch('data/badges.json').then((r) => r.json()),
  ]);
  catalog.items = shop.items;
  catalog.badges = badges.badges;
  catalog.stickers = badges.stickers;
  catalog.rooms = rooms;
  toast = showToast;
  onChange = changed;
}

export const level = () => Math.floor(save.xp / SETTINGS.XP_PER_LEVEL) + 1;

export function addCoins(n) {
  if (!n) return;
  save.coins += n;
  persist();
  onChange();
  const pill = document.getElementById('hud-coins')?.parentElement;
  if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
}

export function bumpStat(key, by = 1) {
  save.stats[key] = (save.stats[key] || 0) + by;
  persist();
  checkBadges();
}

function counter(rule) {
  switch (rule) {
    case 'roomsOpened': return catalog.rooms.filter((r) => roomState(r.id).unlocked).length;
    case 'streak': return save.streak.count;
    case 'level': return level();
    case 'stickers': return save.stickers.length;
    case 'pets': return save.owned.filter((id) => itemById(id)?.type === 'pet').length;
    default: return save.stats[rule] || 0;
  }
}

export function checkBadges() {
  let delay = 0;
  for (const b of catalog.badges) {
    if (save.badges.includes(b.id)) continue;
    const need = b.n === 'all' ? catalog.rooms.length : b.n;
    if (counter(b.rule) >= need) {
      save.badges.push(b.id);
      persist();
      setTimeout(() => { toast(t('newBadge', { b: `${b.emoji} ${pick(b.name)}` })); play('unlock'); }, delay);
      delay += 1200;
    }
  }
}

export function badgeProgress(b) {
  const need = b.n === 'all' ? catalog.rooms.length : b.n;
  return { have: Math.min(counter(b.rule), need), need, earned: save.badges.includes(b.id) };
}

export const itemById = (id) => catalog.items.find((i) => i.id === id);

// Gives a random sticker, preferring ones the child doesn't have yet.
export function giveSticker() {
  const missing = catalog.stickers.filter((s) => !save.stickers.includes(s.id));
  const pool = missing.length ? missing : catalog.stickers;
  const s = pool[Math.floor(Math.random() * pool.length)];
  const isNew = !save.stickers.includes(s.id);
  if (isNew) save.stickers.push(s.id);
  persist();
  checkBadges();
  return { sticker: s, isNew };
}

// Called once when the game starts. Returns { count, coins } if today's bonus is new, else null.
// The bonus stays waiting (unclaimed) if the game is closed before "Collect" is pressed.
export function dailyCheck() {
  const now = today();
  if (save.streak.last !== now) {
    save.streak.count = save.streak.last === today(-1) ? save.streak.count + 1 : 1;
    save.streak.last = now;
    save.streak.unclaimed = SETTINGS.DAILY_BONUS * Math.min(save.streak.count, 7);
    persist();
  }
  return save.streak.unclaimed ? { count: save.streak.count, coins: save.streak.unclaimed } : null;
}

export function claimDaily() {
  const coins = save.streak.unclaimed || 0;
  save.streak.unclaimed = 0;
  addCoins(coins);
  checkBadges();
}

export function freeSurpriseReady(roomId) {
  return save.surpriseDay[roomId] !== today();
}

export function useFreeSurprise(roomId) {
  save.surpriseDay[roomId] = today();
  persist();
}
