// Time taken per question and the "My Progress" summaries. Everything stays on this device.
import { save, persist, today } from './storage.js';
import { t } from './i18n.js';
import { bank } from './questions.js';

const MAX_SECONDS = 300;   // ignore very long pauses (child left the phone)

export function fmtTime(sec) {
  sec = Math.round(sec);
  if (sec < 60) return t('secs', { s: sec });
  return t('minSecs', { m: Math.floor(sec / 60), s: sec % 60 });
}

// Called once per question, when it is finished (answered right, or the answer was shown).
export function recordAnswer(item, firstTry, seconds) {
  const s = Math.min(MAX_SECONDS, Math.max(0, seconds));
  save.qstats ||= {};
  save.days ||= {};
  const q = (save.qstats[item.id] ||= { n: 0, right: 0, time: 0 });
  q.n++;
  if (firstTry) q.right++;
  q.time += s;
  q.last = Math.round(s);
  const d = (save.days[today()] ||= { n: 0, right: 0, time: 0 });
  d.n++;
  if (firstTry) d.right++;
  d.time += s;
  persist();
}

// The question part of a question (skips a long reading passage at the start).
export function shortText(text, max = 90) {
  const parts = String(text).split('\n\n');
  const last = parts[parts.length - 1].replace(/\s+/g, ' ').trim();
  return last.length > max ? `${last.slice(0, max - 1)}…` : last;
}

export function overall() {
  let n = 0, right = 0, time = 0;
  for (const q of Object.values(save.qstats || {})) { n += q.n; right += q.right; time += q.time; }
  return { n, right, time };
}

export function bySubject() {
  const out = {};
  const subjectOf = new Map(bank.all.map((q) => [q.id, q.subject]));
  for (const [id, q] of Object.entries(save.qstats || {})) {
    const sub = subjectOf.get(id);
    if (!sub) continue;
    const o = (out[sub] ||= { n: 0, right: 0, time: 0 });
    o.n += q.n; o.right += q.right; o.time += q.time;
  }
  return out;
}

// Questions that were often wrong or slow – the ones to practise.
export function hardQuestions(lang, limit = 5) {
  const byId = new Map(bank.all.map((q) => [q.id, q]));
  return Object.entries(save.qstats || {})
    .map(([id, s]) => ({ id, s, q: byId.get(id), wrong: s.n - s.right, avg: s.time / s.n }))
    .filter((x) => x.q && x.q[lang] && (x.wrong > 0 || x.avg > 45))
    .sort((a, b) => b.wrong - a.wrong || b.avg - a.avg)
    .slice(0, limit);
}

export function lastDays(count = 7) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const day = today(-i);
    out.push({ day, ...(save.days?.[day] || { n: 0, right: 0, time: 0 }) });
  }
  return out;
}
