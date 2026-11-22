/**
 * Text helpers for Arabic and English passages: splitting a page into short
 * parts, comparing a typed answer with the original, and guessing the language.
 */

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g; // tashkeel + tatweel

/** Lower-cases and removes the spelling differences people don't care about when answering. */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Cleans OCR output: joins broken lines inside a paragraph, keeps blank-line paragraph breaks. */
export function cleanOcrText(raw: string): string {
  const text = raw
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '') // stray direction marks
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((para) => para.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter((para) => para.length > 0)
    .join('\n\n');
  // Arabic text uses the Arabic comma.
  return detectLanguage(text) === 'ar' ? text.replace(/(\S),(?=\s|$)/g, '$1،') : text;
}

const SENTENCE_END = /(?<=[.!?؟؛;:])\s+|\n+/u;

/**
 * Splits a passage into study parts of roughly `maxWords` words, breaking at
 * sentence ends where possible so each part reads on its own.
 */
export function splitIntoParts(text: string, maxWords = 30): string[] {
  const sentences = text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) parts.push(current.join(' '));
    current = [];
  };
  for (const sentence of sentences) {
    const w = words(sentence);
    if (w.length > maxWords) {
      // A very long sentence: cut it into even pieces.
      flush();
      const pieces = Math.ceil(w.length / maxWords);
      const size = Math.ceil(w.length / pieces);
      for (let i = 0; i < w.length; i += size) parts.push(w.slice(i, i + size).join(' '));
      continue;
    }
    if (words(current.join(' ')).length + w.length > maxWords) flush();
    current.push(sentence);
  }
  flush();
  return parts;
}

/** Edit distance between two strings (by character). */
export function levenshtein(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  if (!A.length) return B.length;
  if (!B.length) return A.length;
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length];
}

/** 1 = identical after normalising, 0 = nothing in common. */
export function similarity(answer: string, expected: string): number {
  const a = normalize(answer);
  const b = normalize(expected);
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const charScore = 1 - levenshtein(a, b) / Math.max([...a].length, [...b].length);
  // Word overlap rewards the right words in a slightly different order, but extra
  // words count against it so pasting a whole paragraph is not "correct".
  const wa = words(a);
  const wb = words(b);
  const setA = new Set(wa);
  const setB = new Set(wb);
  const recall = wb.filter((w) => setA.has(w)).length / wb.length;
  const precision = wa.filter((w) => setB.has(w)).length / wa.length;
  const f1 = recall + precision > 0 ? (2 * recall * precision) / (recall + precision) : 0;
  return Math.max(charScore, f1 * 0.95);
}

export type Verdict = 'correct' | 'close' | 'wrong';

export function judge(answer: string, expected: string): Verdict {
  const score = similarity(answer, expected);
  if (score >= 0.85) return 'correct';
  if (score >= 0.4) return 'close';
  return 'wrong';
}

/** 'ar' when most letters are Arabic, otherwise 'en'. */
export function detectLanguage(text: string): 'ar' | 'en' {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic >= latin ? 'ar' : 'en';
}
