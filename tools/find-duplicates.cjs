// Lists questions that look like the same question, so repeats can be caught before a new batch goes live.
// Run from the project folder: node tools/find-duplicates.cjs
// A pair is shown when both have the same right answer and share most of their words, or share nearly
// all their words. Read the list by eye (some are only similar), then add true repeats to data/duplicates.json.
const fs = require('fs');
const path = require('path');

const dir = 'data/questions';
const { files } = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const { hide } = JSON.parse(fs.readFileSync('data/duplicates.json', 'utf8'));
const all = files.flatMap((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return Array.isArray(j) ? j : j.questions || [];
}).filter((q) => !hide[q.id]);

const STOP = new Set('the a an of in is are which what who was were to from for and or by on at it its this that these following find out one with as be not known called name'.split(' '));
const norm = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
const COMMON = 120;   // words in more questions than this say nothing about a match

const found = new Map();
for (const lang of ['en', 'ml']) {
  const items = all.filter((q) => q[lang]?.question && !/^read (the|these)/i.test(q[lang].question)).map((q) => ({
    id: q.id, text: q[lang].question, set: words(q[lang].question), answer: norm(q[lang].options['ABCD'.indexOf(q.answer)]),
  }));
  const index = new Map();
  items.forEach((x, i) => x.set.forEach((w) => { if (!index.has(w)) index.set(w, []); index.get(w).push(i); }));
  items.forEach((a, i) => {
    const near = new Set();
    a.set.forEach((w) => { const l = index.get(w); if (l.length <= COMMON) l.forEach((j) => { if (j > i) near.add(j); }); });
    for (const j of near) {
      const b = items[j];
      const shared = [...a.set].filter((w) => b.set.has(w)).length;
      const smaller = Math.min(a.set.size, b.set.size);
      const whole = a.set.size + b.set.size - shared;
      const sameAnswer = a.answer === b.answer && shared >= 2 && shared / smaller >= 0.5;
      if (sameAnswer || (smaller >= 3 && shared / whole >= 0.75)) {
        found.set([a.id, b.id].sort().join(' + '), `${a.text.slice(0, 80)}  ||  ${b.text.slice(0, 80)}`);
      }
    }
  });
}
for (const [pair, text] of found) console.log(`${pair}\n   ${text}`);
console.log(`\n${found.size} pairs to look at (from ${all.length} questions in use).`);
