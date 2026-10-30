// Turns the text of a question paper into question objects for the game.
// Works best with papers like:
//   1. Question text
//      (A) option  (B) option  (C) option  (D) option
//      Answer: B
// An "Answer key" section at the end (e.g. "1. B  2. D ...") also works.

const MALAYALAM = /[ഀ-ൿ]/g;
const PICTURE_WORDS = /figure|picture|diagram|table|graph|shown|given below|map\b|ചിത്ര|പട്ടിക|ഗ്രാഫ്|ഭൂപട|താഴെ കൊടുത്ത/i;
const MATH_SYMBOLS = /[√∠°²³÷×π≤≥≠∆△□∑∫∞θ√^]|\\frac|\bsqrt\b/;

export function detectLanguage(text) {
  const ml = (text.match(MALAYALAM) || []).length;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  return ml > letters * 0.5 ? 'ml' : 'en';
}

// Old Malayalam fonts (ML-TT, Karthika-ASCII…) turn into nonsense like "hÀj¯nÂ" when copied.
export function looksGarbled(text) {
  const odd = (text.match(/[ -ÿ]/g) || []).length;
  return text.length > 20 && odd / text.length > 0.06;
}

function clean(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function splitAnswerKey(text) {
  const m = text.match(/\n\s*(answer\s*key|answers|key\s*answers|ഉത്തര\s*സൂചിക|ഉത്തരങ്ങൾ)\b[^\n]*\n/i);
  if (!m) return { body: text, key: {} };
  const keyText = text.slice(m.index + m[0].length);
  const key = {};
  for (const k of keyText.matchAll(/(\d{1,3})\s*[.)\-:=]?\s*\(?\s*([A-Da-d])\s*\)?(?![A-Za-z])/g)) key[Number(k[1])] = k[2].toUpperCase();
  return { body: text.slice(0, m.index), key };
}

// Find "1." / "2)" / "Q3." at the start of lines, keeping only numbers that go up one by one.
function splitQuestions(text) {
  const re = /(?:^|\n)[ \t]*(?:Q\.?\s*)?(\d{1,3})[ \t]*[.)][ \t]*/g;
  const marks = [];
  let expected = null;
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (expected === null || n === expected) {
      marks.push({ n, start: m.index, bodyStart: m.index + m[0].length });
      expected = n + 1;
    }
  }
  return marks.map((m, i) => ({ number: m.n, text: text.slice(m.bodyStart, i + 1 < marks.length ? marks[i + 1].start : text.length) }));
}

const LETTER_SETS = [
  ['A', 'B', 'C', 'D'], ['a', 'b', 'c', 'd'], ['എ', 'ബി', 'സി', 'ഡി'], ['1', '2', '3', '4'],
];
const STYLES = [
  (L) => new RegExp(`\\(\\s*${L}\\s*\\)\\s*`),                 // (A)
  (L) => new RegExp(`(?:^|\\s)${L}\\s*[).]\\s*`),             // A)  or  A.
];

function findOptions(body) {
  for (const letters of LETTER_SETS) {
    for (let s = 0; s < STYLES.length; s++) {
      if (letters[0] === '1' && s > 0) continue;                // "1." is too easy to confuse
      const found = [];
      let from = 0;
      for (const L of letters) {
        const m = STYLES[s](L).exec(body.slice(from));
        if (!m) break;
        found.push({ at: from + m.index, after: from + m.index + m[0].length });
        from = from + m.index + m[0].length;
      }
      if (found.length === 4) {
        const options = found.map((f, i) => clean(body.slice(f.after, i < 3 ? found[i + 1].at : body.length)));
        return { question: clean(body.slice(0, found[0].at)), options };
      }
    }
  }
  return { question: clean(body), options: [] };
}

// Returns a list like [{ number, question, options, answer, notes: [...] }]
export function parsePaper(rawText) {
  const text = '\n' + rawText.replace(/\r\n?/g, '\n').replace(/ /g, ' ');
  const { body, key } = splitAnswerKey(text);
  return splitQuestions(body).map(({ number, text: qText }) => {
    const notes = [];
    let answer = key[number] || null;
    const inline = qText.match(/(?:^|\n|\s)(?:answer|ans|ഉത്തരം)\s*[:\-.=]\s*\(?\s*([A-Da-d])\s*\)?(?![A-Za-z])/i);
    if (inline) {
      answer = inline[1].toUpperCase();
      qText = qText.slice(0, inline.index) + qText.slice(inline.index + inline[0].length);
    }
    const { question, options } = findOptions(qText);
    if (!answer) notes.push('answer not found');
    if (options.length !== 4) notes.push('could not find 4 options (A, B, C, D)');
    if (PICTURE_WORDS.test(qText)) notes.push('may need a picture, table or map');
    if (MATH_SYMBOLS.test(qText)) notes.push('has maths symbols – check they look right');
    if (looksGarbled(qText)) notes.push('text looks garbled (old Malayalam font?) – please retype');
    if (question.length < 5) notes.push('question text is very short');
    return { number, question, options: options.length === 4 ? options : ['', '', '', ''], answer, notes };
  });
}

// Joins an English paper and a Malayalam paper (same numbering) into game questions.
export function buildQuestions({ en, ml, subject, cls, difficulty, source, year, prefix, startAt }) {
  const byNum = new Map();
  for (const [lang, list] of [['en', en || []], ['ml', ml || []]]) {
    for (const p of list) {
      if (!byNum.has(p.number)) byNum.set(p.number, {});
      byNum.get(p.number)[lang] = p;
    }
  }
  let n = startAt;
  return [...byNum.keys()].sort((a, b) => a - b).map((num) => {
    const parts = byNum.get(num);
    const notes = [];
    const q = {
      id: `${prefix}-${String(n++).padStart(4, '0')}`,
      subject,
      class: cls,
      difficulty,
      answer: parts.en?.answer || parts.ml?.answer || '',
    };
    if (parts.en && parts.ml && parts.en.answer && parts.ml.answer && parts.en.answer !== parts.ml.answer) {
      notes.push('English and Malayalam answers are different');
    }
    for (const lang of ['en', 'ml']) {
      const p = parts[lang];
      if (!p) continue;
      q[lang] = { question: p.question, options: p.options, hint: '', explanation: '' };
      const own = q.answer ? p.notes.filter((x) => x !== 'answer not found') : p.notes;
      notes.push(...own.map((x) => (parts.en && parts.ml ? `${lang}: ${x}` : x)));
    }
    q.source = source;
    q.year = year || null;
    q.reviewed = false;
    q.needsReview = notes.length > 0;
    if (notes.length) q.reviewNotes = notes;
    return q;
  });
}
