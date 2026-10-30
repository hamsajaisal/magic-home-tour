// The rules for one question. Used by the game AND by the converter/checker tool.
export const LETTERS = ['A', 'B', 'C', 'D'];
export const SUBJECTS = ['maths', 'science', 'malayalam', 'english', 'social', 'gk'];

// Returns a list of problems (empty list = the question is fine).
export function validateQuestion(q) {
  const problems = [];
  if (!q || typeof q !== 'object') return ['not a question object'];
  if (!q.id || typeof q.id !== 'string') problems.push('missing "id"');
  if (!q.subject || typeof q.subject !== 'string') problems.push('missing "subject"');
  if (!LETTERS.includes(String(q.answer).toUpperCase())) problems.push('"answer" must be A, B, C or D');
  const langs = ['en', 'ml'].filter((l) => q[l]);
  if (!langs.length) problems.push('needs an "en" or "ml" part (or both)');
  for (const l of langs) {
    const part = q[l];
    if (!part.question || typeof part.question !== 'string') problems.push(`"${l}" has no question text`);
    if (!Array.isArray(part.options) || part.options.length !== 4 || part.options.some((o) => String(o ?? '').trim() === '')) {
      problems.push(`"${l}" must have exactly 4 options`);
    }
  }
  return problems;
}

// Which languages does this question have? e.g. ['en', 'ml']
export function languagesOf(q) {
  return ['en', 'ml'].filter((l) => q[l] && q[l].question);
}
