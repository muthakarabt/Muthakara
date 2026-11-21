/**
 * Points, levels, achievements and the puzzle generators for the memory games.
 * Everything here is pure so it can be unit tested.
 */

export const XP = {
  study: 10,
  reviewGood: 8,
  reviewHard: 5,
  reviewAgain: 2,
  gameCorrect: 5,
  gamePerfectBonus: 15,
} as const;

/** Level n starts at 50·(n−1)² XP: 0, 50, 200, 450, 800 … */
export function levelFor(xp: number): { level: number; current: number; next: number; progress: number } {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  const current = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, current, next, progress: (xp - current) / (next - current) };
}

export type AchievementId =
  | 'first_page'
  | 'ten_pages'
  | 'fifty_pages'
  | 'streak3'
  | 'streak7'
  | 'streak30'
  | 'reviews25'
  | 'reviews100'
  | 'first_game'
  | 'perfect_game'
  | 'mastered10'
  | 'level5';

export type StatsLike = {
  xp: number;
  studied: number;
  reviews: number;
  mastered: number;
  games: number;
  perfectGames: number;
  streak: number;
};

export const ACHIEVEMENTS: { id: AchievementId; icon: string; test: (s: StatsLike) => boolean }[] = [
  { id: 'first_page', icon: '🌱', test: (s) => s.studied >= 1 },
  { id: 'ten_pages', icon: '📘', test: (s) => s.studied >= 10 },
  { id: 'fifty_pages', icon: '📚', test: (s) => s.studied >= 50 },
  { id: 'streak3', icon: '🔥', test: (s) => s.streak >= 3 },
  { id: 'streak7', icon: '⚡', test: (s) => s.streak >= 7 },
  { id: 'streak30', icon: '🏆', test: (s) => s.streak >= 30 },
  { id: 'reviews25', icon: '🔁', test: (s) => s.reviews >= 25 },
  { id: 'reviews100', icon: '🧠', test: (s) => s.reviews >= 100 },
  { id: 'first_game', icon: '🎮', test: (s) => s.games >= 1 },
  { id: 'perfect_game', icon: '🎯', test: (s) => s.perfectGames >= 1 },
  { id: 'mastered10', icon: '💎', test: (s) => s.mastered >= 10 },
  { id: 'level5', icon: '👑', test: (s) => levelFor(s.xp).level >= 5 },
];

// ---------- randomness ----------

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deterministic RNG for tests. */
export function seeded(seed: number): Rng {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

// ---------- fill-the-gap puzzle ----------

export type NotePage = { id: number; keywords: string; question: string; label: string; subject_title: string };

export type ClozeRound = {
  pageId: number;
  subject: string;
  before: string;
  after: string;
  answer: string;
  options: string[];
};

const WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/gu;
// Very common words make poor blanks.
const STOP = new Set([
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'هو', 'هي', 'ثم', 'أو', 'او', 'التي', 'الذي', 'هذا', 'هذه', 'كان', 'أن', 'ان', 'لا', 'ما', 'كل',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'into', 'its', 'has', 'have', 'not', 'but', 'you', 'your',
]);

export function candidateWords(text: string): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = [];
  for (const m of text.matchAll(WORD)) {
    const w = m[0];
    if ([...w].length < 3 || STOP.has(w.toLowerCase()) || /^\d+$/.test(w)) continue;
    out.push({ word: w, index: m.index ?? 0 });
  }
  return out;
}

/**
 * Hides one meaningful word from a page's notes and offers it among words
 * taken from the user's other notes, so every option is plausible.
 */
export function makeCloze(page: NotePage, pool: readonly NotePage[], rng: Rng = Math.random): ClozeRound | null {
  const text = page.keywords.trim();
  const candidates = candidateWords(text);
  if (candidates.length < 2) return null; // a single word leaves no context to recall from
  // Prefer longer words: they tend to be the key terms.
  const ranked = shuffle(candidates, rng).sort((a, b) => [...b.word].length - [...a.word].length);
  const pick = ranked[Math.floor(rng() * Math.min(3, ranked.length))];

  const seen = new Set([pick.word.toLowerCase()]);
  const distractors: string[] = [];
  const others = shuffle(
    pool.filter((p) => p.id !== page.id).flatMap((p) => candidateWords(p.keywords).map((c) => c.word)),
    rng,
  );
  const sameText = shuffle(candidates.map((c) => c.word), rng);
  for (const w of [...others, ...sameText]) {
    if (distractors.length === 3) break;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(w);
  }
  if (distractors.length < 2) return null;

  return {
    pageId: page.id,
    subject: page.subject_title,
    before: text.slice(0, pick.index),
    after: text.slice(pick.index + pick.word.length),
    answer: pick.word,
    options: shuffle([pick.word, ...distractors], rng),
  };
}

export function makeClozeRounds(pool: readonly NotePage[], count: number, rng: Rng = Math.random): ClozeRound[] {
  const rounds: ClozeRound[] = [];
  for (const page of shuffle(pool, rng)) {
    if (rounds.length >= count) break;
    const r = makeCloze(page, pool, rng);
    if (r) rounds.push(r);
  }
  return rounds;
}

// ---------- match-the-pairs puzzle ----------

export type MatchPage = NotePage & { kind: 'image' | 'pdf'; uri: string };

export type MatchCard = {
  key: string;
  pairId: number;
  side: 'prompt' | 'answer';
  text: string;
  imageUri?: string;
};

function clip(text: string, max = 70): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return [...t].length > max ? [...t].slice(0, max - 1).join('') + '…' : t;
}

/**
 * Builds pairs of (question or page photo) ↔ the user's own keywords.
 * Returns prompts and answers shuffled independently.
 */
export function makeMatch(
  pool: readonly MatchPage[],
  size = 4,
  rng: Rng = Math.random,
): { prompts: MatchCard[]; answers: MatchCard[] } | null {
  const picked = shuffle(
    pool.filter((p) => p.keywords.trim()),
    rng,
  ).slice(0, size);
  if (picked.length < 3) return null;
  const prompts: MatchCard[] = picked.map((p) => {
    if (p.question.trim()) return { key: `q${p.id}`, pairId: p.id, side: 'prompt', text: clip(p.question) };
    if (p.kind === 'image') return { key: `q${p.id}`, pairId: p.id, side: 'prompt', text: p.label, imageUri: p.uri };
    return { key: `q${p.id}`, pairId: p.id, side: 'prompt', text: `${p.subject_title} · ${p.label}` };
  });
  const answers: MatchCard[] = picked.map((p) => ({
    key: `a${p.id}`,
    pairId: p.id,
    side: 'answer',
    text: clip(p.keywords),
  }));
  return { prompts: shuffle(prompts, rng), answers: shuffle(answers, rng) };
}
