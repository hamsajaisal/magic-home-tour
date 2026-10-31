// Game text in Malayalam and English. The words themselves live in data/lang/*.json.
export const LANGS = ['ml', 'en'];
const strings = {};
const listeners = [];
let current = 'ml';

export async function loadLanguages() {
  await Promise.all(LANGS.map(async (l) => {
    const res = await fetch(`data/lang/${l}.json`);
    if (!res.ok) throw new Error(`Missing language file data/lang/${l}.json`);
    strings[l] = await res.json();
  }));
}

export function lang() { return current; }

export function setLang(l) {
  if (!LANGS.includes(l)) l = 'en';
  current = l;
  document.documentElement.lang = l;
  applyToPage();
  listeners.forEach((fn) => fn(l));
}

export function onLangChange(fn) { listeners.push(fn); }

// t('lockedPrompt', { room: 'Kitchen', n: 5 }) -> text with {room} and {n} filled in
export function t(key, vars = {}) {
  let s = strings[current]?.[key] ?? strings.en?.[key] ?? key;
  if (Array.isArray(s)) s = s[Math.floor(Math.random() * s.length)];
  return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

// The same text in a chosen language (no random pick): tIn('en', 'praise') -> the whole list
export function tIn(l, key) {
  return strings[l]?.[key] ?? strings.en?.[key] ?? key;
}

// Pick the right language out of an object like { en: "Kitchen", ml: "അടുക്കള" }
export function pick(obj) {
  if (!obj) return '';
  return obj[current] ?? obj.en ?? obj.ml ?? '';
}

export function applyToPage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  // names read out by screen readers for icon-only buttons
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}
