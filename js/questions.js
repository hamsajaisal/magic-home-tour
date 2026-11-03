// Loads the question files listed in data/questions/index.json and picks questions for each quiz.
import { SETTINGS } from '../settings.js';
import { validateQuestion, languagesOf, LETTERS } from './question-format.js';

export const bank = { all: [], problems: [] };

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
  if (bank.problems.length) console.warn('Question problems (these were skipped):\n' + bank.problems.join('\n'));
  return bank;
}

export function available(subject, lang) {
  return bank.all.filter((q) =>
    (subject === 'mix' || q.subject === subject) &&
    languagesOf(q).includes(lang) &&
    (SETTINGS.SHOW_UNREVIEWED || q.reviewed) &&
    (SETTINGS.SHOW_NEEDS_REVIEW || !q.needsReview));
}

// Questions the child got wrong before, hardest first (for the revision cupboard).
export function wrongQuestions(save, lang) {
  return bank.all
    .filter((q) => save.wrong[q.id] > 0 && q[lang])
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

// Build one quiz: questions seen least often come first, with a little randomness.
export function makeQuiz(subject, lang, count, save) {
  const pool = available(subject, lang)
    .map((q) => ({ q, score: (save.seen[q.id] || 0) + Math.random() * 0.9 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((x) => x.q);
  return shuffle(pool).map((q) => toQuizItem(q, lang));
}

// Bonus level: questions from every subject, the hard ones first, then medium, then easy.
const DIFFICULTY = { hard: 0, medium: 1.2, easy: 3 };
export function makeHardQuiz(lang, count, save) {
  const pool = available('mix', lang)
    .map((q) => ({ q, score: (DIFFICULTY[q.difficulty] ?? 1.5) + (save.seen[q.id] || 0) * 0.8 + Math.random() }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((x) => x.q);
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
    const s = creditOf(q, lang) || ownLabel;
    const e = set.get(s) || { count: 0, link: null };
    e.count++;
    e.link ||= q.creditLink?.url || null;
    set.set(s, e);
  }
  return [...set.entries()].map(([src, e]) => [src, e.count, e.link]);
}
