// Loads the question files listed in data/questions/index.json and picks questions for each quiz.
import { SETTINGS } from '../settings.js';
import { validateQuestion, languagesOf, LETTERS } from './question-format.js';

export const bank = { all: [], problems: [] };
const PASSAGE_LENGTH = 160;   // a question this long carries its own passage or poem

export async function loadQuestions() {
  const index = await (await fetch('data/questions/index.json')).json();
  const seenIds = new Set();
  for (const file of index.files || []) {
    let list;
    try {
      const res = await fetch(`data/questions/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      list = await res.json();
    } catch (e) {
      bank.problems.push(`${file}: could not be read (${e.message}). Check for a missing comma or quote.`);
      continue;
    }
    if (!Array.isArray(list)) list = list.questions || [];
    list.forEach((q, i) => {
      const problems = validateQuestion(q);
      if (q && seenIds.has(q.id)) problems.push(`id "${q.id}" is used twice`);
      if (problems.length) {
        bank.problems.push(`${file} #${i + 1} (${q?.id ?? 'no id'}): ${problems.join(', ')}`);
        return;
      }
      seenIds.add(q.id);
      q.answer = String(q.answer).toUpperCase();
      q._file = file;
      bank.all.push(q);
    });
  }
  await markRepeats();
  if (bank.problems.length) console.warn('Question problems (these were skipped):\n' + bank.problems.join('\n'));
  return bank;
}

// The same question often came from two sources: data/duplicates.json hides the extra copies.
// Questions on one passage or poem share a "family", so a child doesn't read that passage twice in a round.
async function markRepeats() {
  try {
    const res = await fetch('data/duplicates.json');
    const { hide = {} } = res.ok ? await res.json() : {};
    for (const q of bank.all) if (hide[q.id]) q.hidden = true;
  } catch (e) {
    console.warn('data/duplicates.json could not be read:', e.message);
  }
  for (const q of bank.all) {
    const text = (q.en || q.ml).question;
    if (text.length >= PASSAGE_LENGTH) q.family = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 60);
  }
}

export function available(subject, lang) {
  return bank.all.filter((q) =>
    !q.hidden &&
    (subject === 'mix' || q.subject === subject) &&
    languagesOf(q).includes(lang) &&
    (SETTINGS.SHOW_UNREVIEWED || q.reviewed) &&
    (SETTINGS.SHOW_NEEDS_REVIEW || !q.needsReview));
}

// Questions the child got wrong before, hardest first (for the revision cupboard).
export function wrongQuestions(save, lang) {
  return bank.all
    .filter((q) => !q.hidden && save.wrong[q.id] > 0 && q[lang])
    .sort((a, b) => save.wrong[b.id] - save.wrong[a.id]);
}

export function makeRevisionQuiz(save, lang, count) {
  return wrongQuestions(save, lang).slice(0, count).map((q) => toQuizItem(q, lang));
}

// Options like "All of these" must stay in place, so we don't shuffle those questions.
const NO_SHUFFLE = /all of|none of|both|above|ഇവയെല്ലാം|ഇവയൊന്നുമല്ല|രണ്ടും|എല്ലാം|മുകളിൽ/i;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Picks `count` questions: the ones seen least often first, with a little randomness.
// A passage counts as seen when any of its questions was, and comes once per round if there are enough others.
export function pickQuestions(pool, count, seen, score = (q, times) => times) {
  const familySeen = new Map();
  for (const q of pool) if (q.family) familySeen.set(q.family, (familySeen.get(q.family) || 0) + (seen[q.id] || 0));
  const ranked = pool
    .map((q) => ({ q, score: score(q, q.family ? familySeen.get(q.family) : seen[q.id] || 0) + Math.random() * 0.9 }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.q);
  const families = new Set();
  const picked = [];
  const later = [];
  for (const q of ranked) {
    if (q.family && families.has(q.family)) { later.push(q); continue; }
    if (q.family) families.add(q.family);
    picked.push(q);
  }
  return picked.concat(later).slice(0, count);
}

// Build one quiz.
export function makeQuiz(subject, lang, count, save) {
  const pool = pickQuestions(available(subject, lang), count, save.seen);
  return shuffle(pool).map((q) => toQuizItem(q, lang));
}

// Bonus level: questions from every subject, the hard ones first, then medium, then easy.
const DIFFICULTY = { hard: 0, medium: 1.2, easy: 3 };
export function makeHardQuiz(lang, count, save) {
  const pool = pickQuestions(available('mix', lang), count, save.seen,
    (q, times) => (DIFFICULTY[q.difficulty] ?? 1.5) + times * 0.8);
  return shuffle(pool).map((q) => toQuizItem(q, lang));
}

// `order` keeps the same A/B/C/D order when the child switches language mid-question.
export function toQuizItem(q, lang, order = null) {
  if (!q[lang]) return null;
  const part = q[lang];
  const correctIndex = LETTERS.indexOf(q.answer);
  if (!order) {
    order = [0, 1, 2, 3];
    const canShuffle = SETTINGS.SHUFFLE_OPTIONS && !q.noShuffle && !part.options.some((o) => NO_SHUFFLE.test(String(o)));
    if (canShuffle) shuffle(order);
  }
  const options = order.map((i) => ({ text: String(part.options[i]), correct: i === correctIndex }));
  return {
    raw: q,
    order,
    id: q.id,
    question: part.question,
    options,
    hint: part.hint || '',
    explanation: part.explanation || '',
    source: [q.source, q.year && !String(q.source).includes(String(q.year)) ? q.year : null].filter(Boolean).join(', '),
    reviewed: !!q.reviewed,
    credit: creditOf(q, lang),
    creditLink: q.creditLink || null,
  };
}

// The short thank-you name for a question's source, e.g. "KSTA – USS model exam 2026".
// "credit" can be one text, or { "en": "...", "ml": "..." }. Our own questions have none.
export function creditOf(q, lang) {
  const c = q.credit;
  if (!c) return '';
  return typeof c === 'string' ? c : (c[lang] || c.en || c.ml || '');
}

// For the Credits page: each source with how many questions came from it, and its link if it has one.
// ownLabel names the questions written for this game (those have no "credit").
export function sources(lang, ownLabel) {
  const set = new Map();
  for (const q of bank.all) {
    if (q.hidden) continue;
    const s = creditOf(q, lang) || ownLabel;
    const e = set.get(s) || { count: 0, link: null };
    e.count++;
    e.link ||= q.creditLink?.url || null;
    set.set(s, e);
  }
  return [...set.entries()].map(([src, e]) => [src, e.count, e.link]);
}
