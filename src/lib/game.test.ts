import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACHIEVEMENTS, candidateWords, levelFor, makeCloze, makeClozeRounds, makeMatch, seeded } from './game.ts';

const page = (id: number, keywords: string, question = '') => ({
  id,
  keywords,
  question,
  label: `Page ${id}`,
  subject_title: 'Bio',
  kind: 'image' as const,
  uri: `file:///p${id}.jpg`,
});

test('levels grow quadratically', () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(49).level, 1);
  assert.equal(levelFor(50).level, 2);
  assert.equal(levelFor(200).level, 3);
  assert.equal(levelFor(125).progress, 0.5);
});

test('candidate words skip short and stop words, keep Arabic', () => {
  const words = candidateWords('الميتوكوندريا هي مصنع الطاقة في الخلية').map((w) => w.word);
  assert.deepEqual(words, ['الميتوكوندريا', 'مصنع', 'الطاقة', 'الخلية']);
});

test('cloze hides a word that appears in the options, and rebuilds the text', () => {
  const pool = [
    page(1, 'الميتوكوندريا مصنع الطاقة في الخلية'),
    page(2, 'النواة تحتوي المادة الوراثية'),
    page(3, 'البلاستيدات الخضراء تقوم بالبناء الضوئي'),
  ];
  for (let seed = 1; seed < 30; seed++) {
    const r = makeCloze(pool[0], pool, seeded(seed));
    assert.ok(r);
    assert.ok(r.options.includes(r.answer));
    assert.equal(new Set(r.options).size, r.options.length);
    assert.ok(r.options.length >= 3 && r.options.length <= 4);
    assert.equal(r.before + r.answer + r.after, pool[0].keywords);
  }
});

test('cloze needs at least two meaningful words', () => {
  assert.equal(makeCloze(page(1, 'خلية'), [page(2, 'نواة كبيرة جداً')], seeded(1)), null);
});

test('cloze rounds never exceed requested count', () => {
  const pool = [1, 2, 3, 4, 5, 6].map((i) => page(i, `word${i}a word${i}b word${i}c`));
  assert.equal(makeClozeRounds(pool, 4, seeded(7)).length, 4);
});

test('match builds aligned pairs from questions, photos and keywords', () => {
  const pool = [page(1, 'k one', 'Q1?'), page(2, 'k two'), page(3, 'k three', 'Q3?'), page(4, 'k four')];
  const m = makeMatch(pool, 4, seeded(3));
  assert.ok(m);
  assert.equal(m.prompts.length, 4);
  assert.deepEqual(
    m.prompts.map((p) => p.pairId).sort(),
    m.answers.map((a) => a.pairId).sort(),
  );
  const photo = m.prompts.find((p) => p.pairId === 2);
  assert.equal(photo?.imageUri, 'file:///p2.jpg');
});

test('match needs at least three pages', () => {
  assert.equal(makeMatch([page(1, 'a b'), page(2, 'c d')]), null);
});

test('achievements unlock from stats', () => {
  const stats = { xp: 900, studied: 12, reviews: 3, mastered: 0, games: 1, perfectGames: 0, streak: 3 };
  const unlocked = ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);
  assert.deepEqual(unlocked, ['first_page', 'ten_pages', 'streak3', 'first_game', 'level5']);
});
