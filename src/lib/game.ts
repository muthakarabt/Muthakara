/**
 * Points, levels, achievements and the puzzle generators for the memory games.
 * Everything here is pure so it can be unit tested.
 */

export const XP = {
  study: 10,
  testCorrect: 5,
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
  { id: 'first_page', icon: 'leaf-outline', test: (s) => s.studied >= 1 },
  { id: 'ten_pages', icon: 'book-outline', test: (s) => s.studied >= 10 },
  { id: 'fifty_pages', icon: 'library-outline', test: (s) => s.studied >= 50 },
  { id: 'streak3', icon: 'flame-outline', test: (s) => s.streak >= 3 },
  { id: 'streak7', icon: 'flash-outline', test: (s) => s.streak >= 7 },
  { id: 'streak30', icon: 'trophy-outline', test: (s) => s.streak >= 30 },
  { id: 'reviews25', icon: 'repeat-outline', test: (s) => s.reviews >= 25 },
  { id: 'reviews100', icon: 'bulb-outline', test: (s) => s.reviews >= 100 },
  { id: 'first_game', icon: 'game-controller-outline', test: (s) => s.games >= 1 },
  { id: 'perfect_game', icon: 'locate-outline', test: (s) => s.perfectGames >= 1 },
  { id: 'mastered10', icon: 'diamond-outline', test: (s) => s.mastered >= 10 },
  { id: 'level5', icon: 'ribbon-outline', test: (s) => levelFor(s.xp).level >= 5 },
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

// ---------- puzzles ----------

/** Anything that can be played: its passage, or the user's own notes when there is no passage. */
export type PlayCard = {
  id: number;
  text: string;
  keywords: string;
  question: string;
  label: string;
  subject_title: string;
  kind: 'image' | 'pdf' | 'text';
  uri: string;
};

export function passageOf(card: Pick<PlayCard, 'text' | 'keywords'>): string {
  return (card.text.trim() || card.keywords.trim()).replace(/\s+/g, ' ');
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/gu;
// Very common words make poor blanks.
const STOP = new Set([
  'في', 'من', 'على', 'إلى', 'الى', 'عن', 'مع', 'هو', 'هي', 'ثم', 'أو', 'او', 'التي', 'الذي', 'هذا', 'هذه', 'كان', 'أن', 'ان', 'لا', 'ما', 'كل', 'قد', 'لقد', 'وهو', 'وهي', 'ذلك', 'تلك', 'بين', 'عند', 'حتى', 'إذا', 'اذا',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'into', 'its', 'has', 'have', 'not', 'but', 'you', 'your', 'they', 'their', 'which', 'were', 'been', 'will', 'can',
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

function pickKeyWord(candidates: { word: string; index: number }[], rng: Rng) {
  // Longer words tend to be the key terms; pick among the top three.
  const ranked = shuffle(candidates, rng).sort((a, b) => [...b.word].length - [...a.word].length);
  return ranked[Math.floor(rng() * Math.min(3, ranked.length))];
}

// Fill the gap (multiple choice)

export type ClozeRound = {
  type: 'cloze';
  cardId: number;
  subject: string;
  before: string;
  after: string;
  answer: string;
  options: string[];
};

export function makeCloze(card: PlayCard, pool: readonly PlayCard[], rng: Rng = Math.random): ClozeRound | null {
  const text = passageOf(card);
  const candidates = candidateWords(text);
  if (candidates.length < 2) return null; // a single word leaves no context to recall from
  const pick = pickKeyWord(candidates, rng);

  const seen = new Set([pick.word.toLowerCase()]);
  const distractors: string[] = [];
  const others = shuffle(
    pool.filter((p) => p.id !== card.id).flatMap((p) => candidateWords(passageOf(p)).map((c) => c.word)),
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
  if (distractors.length < 1) return null;

  return {
    type: 'cloze',
    cardId: card.id,
    subject: card.subject_title,
    before: text.slice(0, pick.index),
    after: text.slice(pick.index + pick.word.length),
    answer: pick.word,
    options: shuffle([pick.word, ...distractors], rng),
  };
}

// Write it from memory (typed answer)

export type TypeRound = {
  type: 'type';
  cardId: number;
  subject: string;
  before: string;
  after: string;
  answer: string;
};

/** Hides a short phrase (1–3 words starting at a key word) for the user to type. */
export function makeTypeRound(card: PlayCard, rng: Rng = Math.random): TypeRound | null {
  const text = passageOf(card);
  const candidates = candidateWords(text);
  if (candidates.length < 2) return null;
  const pick = pickKeyWord(candidates, rng);
  // Extend the blank to the following word(s) when the passage is long enough to keep context.
  const all = [...text.matchAll(/\S+/g)].map((m) => ({ word: m[0], index: m.index ?? 0 }));
  // The token that holds the key word. It can start earlier than the word itself
  // when punctuation is attached, e.g. «word» or (word.
  let start = 0;
  while (start + 1 < all.length && all[start + 1].index <= pick.index) start++;
  const extra = all.length >= 12 ? Math.floor(rng() * 3) : 0; // 0–2 extra words
  const end = Math.min(all.length - 1, start + extra);
  const from = pick.index;
  const to =
    end === start
      ? pick.index + pick.word.length
      : all[end].index + all[end].word.replace(/[^\p{L}\p{N}\p{M}]+$/u, '').length;
  return {
    type: 'type',
    cardId: card.id,
    subject: card.subject_title,
    before: text.slice(0, from),
    after: text.slice(to),
    answer: text.slice(from, to),
  };
}

// Put the words in order

export type OrderRound = {
  type: 'order';
  cardId: number;
  subject: string;
  /** The words in the right order. */
  answer: string[];
  /** Indexes into `answer`, shuffled. */
  shuffled: number[];
};

export function makeOrderRound(card: PlayCard, rng: Rng = Math.random, maxWords = 9): OrderRound | null {
  const all = passageOf(card).split(/\s+/).filter(Boolean);
  if (all.length < 3) return null;
  let start = 0;
  if (all.length > maxWords) {
    // Prefer starting right after a sentence end so the piece makes sense on its own.
    const starts = [0, ...all.flatMap((w, i) => (/[.!?؟؛]$/u.test(w) && i + 1 < all.length - 2 ? [i + 1] : []))].filter(
      (i) => i <= all.length - 3,
    );
    start = starts[Math.floor(rng() * starts.length)];
  }
  const answer = all.slice(start, start + maxWords);
  let shuffled = shuffle(
    answer.map((_, i) => i),
    rng,
  );
  // Never hand over the answer already solved.
  if (shuffled.every((v, i) => v === i)) shuffled = [...shuffled.slice(1), shuffled[0]];
  return { type: 'order', cardId: card.id, subject: card.subject_title, answer, shuffled };
}

/** Share of words in the right place. */
export function orderScore(answer: readonly string[], attempt: readonly string[]): number {
  if (!answer.length) return 0;
  return answer.filter((w, i) => attempt[i] === w).length / answer.length;
}

// Match the pairs

export type MatchCard = {
  key: string;
  pairId: number;
  side: 'prompt' | 'answer';
  text: string;
  imageUri?: string;
};

export type MatchRound = { type: 'match'; prompts: MatchCard[]; answers: MatchCard[] };

function clip(text: string, max = 70): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return [...t].length > max ? [...t].slice(0, max - 1).join('') + '…' : t;
}

/**
 * Pairs the start of each passage with its ending (or a question with its notes).
 * Needs at least two cards; prompts and answers are shuffled independently.
 */
export function makeMatch(pool: readonly PlayCard[], size = 4, rng: Rng = Math.random): MatchRound | null {
  const usable = shuffle(
    pool.filter((p) => passageOf(p).split(/\s+/).length >= 4 || (p.question.trim() && p.keywords.trim())),
    rng,
  ).slice(0, size);
  if (usable.length < 2) return null;
  const prompts: MatchCard[] = [];
  const answers: MatchCard[] = [];
  for (const p of usable) {
    if (!p.text.trim() && p.question.trim() && p.keywords.trim()) {
      prompts.push({ key: `q${p.id}`, pairId: p.id, side: 'prompt', text: clip(p.question) });
      answers.push({ key: `a${p.id}`, pairId: p.id, side: 'answer', text: clip(p.keywords) });
      continue;
    }
    const w = passageOf(p).split(/\s+/);
    const cut = Math.max(2, Math.min(w.length - 2, Math.round(w.length / 2)));
    prompts.push({ key: `q${p.id}`, pairId: p.id, side: 'prompt', text: clip(w.slice(0, cut).join(' ')) + ' …' });
    answers.push({ key: `a${p.id}`, pairId: p.id, side: 'answer', text: '… ' + clip(w.slice(cut).join(' ')) });
  }
  return { type: 'match', prompts: shuffle(prompts, rng), answers: shuffle(answers, rng) };
}

// Choosing a round

export type SingleRound = ClozeRound | TypeRound | OrderRound;
export type SingleGame = 'cloze' | 'type' | 'order';

/** Builds one round for a card, trying the requested game first and falling back to any that fits. */
export function makeRound(
  card: PlayCard,
  pool: readonly PlayCard[],
  game: SingleGame | 'mix',
  rng: Rng = Math.random,
): SingleRound | null {
  const order: SingleGame[] =
    game === 'mix' ? shuffle(['cloze', 'type', 'order'] as SingleGame[], rng) : [game, 'cloze', 'type', 'order'];
  for (const g of order) {
    const r = g === 'cloze' ? makeCloze(card, pool, rng) : g === 'type' ? makeTypeRound(card, rng) : makeOrderRound(card, rng);
    if (r) return r;
  }
  return null;
}
