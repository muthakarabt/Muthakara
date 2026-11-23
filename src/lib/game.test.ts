import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACHIEVEMENTS,
  candidateWords,
  levelFor,
  makeCloze,
  makeMatch,
  makeOrderRound,
  makeRound,
  makeTypeRound,
  orderScore,
  seeded,
} from './game.ts';

const card = (id: number, text: string, extra: Partial<{ keywords: string; question: string }> = {}) => ({
  id,
  text,
  keywords: extra.keywords ?? '',
  question: extra.question ?? '',
  label: `Page ${id}`,
  subject_title: 'Bio',
  kind: 'image' as const,
  uri: `file:///p${id}.jpg`,
});

const P1 = 'الميتوكوندريا مصنع الطاقة في الخلية وتنتج جزيئات الطاقة عبر التنفس الخلوي.';
const P2 = 'النواة تحتوي المادة الوراثية وتتحكم في نشاط الخلية.';
const P3 = 'البلاستيدات الخضراء تقوم بالبناء الضوئي في الخلايا النباتية.';

test('levels grow quadratically', () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(50).level, 2);
  assert.equal(levelFor(200).level, 3);
  assert.equal(levelFor(125).progress, 0.5);
});

test('candidate words skip short and stop words, keep Arabic', () => {
  const w = candidateWords('الميتوكوندريا هي مصنع الطاقة في الخلية').map((x) => x.word);
  assert.deepEqual(w, ['الميتوكوندريا', 'مصنع', 'الطاقة', 'الخلية']);
});

test('cloze works with a single card and rebuilds the passage', () => {
  for (let seed = 1; seed < 25; seed++) {
    const r = makeCloze(card(1, P1), [card(1, P1)], seeded(seed));
    assert.ok(r);
    assert.ok(r.options.includes(r.answer));
    assert.equal(new Set(r.options).size, r.options.length);
    assert.equal(r.before + r.answer + r.after, P1);
  }
});

test('cloze falls back to notes when a card has no passage', () => {
  const r = makeCloze(card(1, '', { keywords: 'الطاقة تنتجها الميتوكوندريا' }), [], seeded(2));
  assert.ok(r);
});

test('typed round hides 1–3 words and rebuilds the passage', () => {
  for (let seed = 1; seed < 25; seed++) {
    const r = makeTypeRound(card(1, P1), seeded(seed));
    assert.ok(r);
    const n = r.answer.split(/\s+/).length;
    assert.ok(n >= 1 && n <= 3, r.answer);
    assert.equal(r.before + r.answer + r.after, P1);
  }
});

test('type round handles key words wrapped in quotes or brackets', () => {
  const texts = ['قال المعلم «الضوئي»', 'The cell has a (nucleus)', '«البناء» الضوئي في الخلايا النباتية الخضراء'];
  for (const text of texts) {
    for (let seed = 1; seed < 40; seed++) {
      const r = makeTypeRound(card(1, text), seeded(seed));
      assert.ok(r);
      assert.equal(r.before + r.answer + r.after, text);
      // The blank is the word itself, never the punctuation around it.
      assert.match(r.answer, /^[\p{L}\p{N}]/u);
      assert.match(r.answer, /[\p{L}\p{N}\p{M}]$/u);
    }
  }
});

test('order round is never pre-solved and scores positions', () => {
  for (let seed = 1; seed < 25; seed++) {
    const r = makeOrderRound(card(1, P1), seeded(seed));
    assert.ok(r);
    assert.ok(r.answer.length >= 3 && r.answer.length <= 9);
    assert.notDeepEqual(r.shuffled, r.answer.map((_, i) => i));
  }
  assert.equal(orderScore(['a', 'b', 'c', 'd'], ['a', 'b', 'd', 'c']), 0.5);
});

test('match pairs passage starts with endings, from two cards', () => {
  const m = makeMatch([card(1, P1), card(2, P2)], 4, seeded(3));
  assert.ok(m);
  assert.equal(m.prompts.length, 2);
  assert.deepEqual(m.prompts.map((p) => p.pairId).sort(), m.answers.map((a) => a.pairId).sort());
  assert.equal(makeMatch([card(1, P1)]), null);
});

test('makeRound falls back when the chosen game does not fit', () => {
  const r = makeRound(card(1, 'كلمتان فقط'), [card(1, 'كلمتان فقط')], 'order', seeded(1));
  assert.ok(r === null || r.type !== 'order' || r.answer.length >= 3);
  const mix = makeRound(card(1, P3), [card(1, P3)], 'mix', seeded(5));
  assert.ok(mix);
});

test('achievements unlock from stats', () => {
  const stats = { xp: 900, studied: 12, reviews: 3, mastered: 0, games: 1, perfectGames: 0, streak: 3 };
  const unlocked = ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);
  assert.deepEqual(unlocked, ['first_page', 'ten_pages', 'streak3', 'first_game', 'level5']);
});
