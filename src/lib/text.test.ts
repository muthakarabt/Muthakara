import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanOcrText, detectLanguage, judge, normalize, splitIntoParts } from './text.ts';

test('normalize unifies Arabic spelling variants and strips diacritics', () => {
  assert.equal(normalize('إِنَّ المَدْرَسَةَ'), normalize('ان المدرسه'));
  assert.equal(normalize('مستشفى'), normalize('مستشفي'));
  assert.equal(normalize('Hello, World!'), 'hello world');
});

test('judge: correct, close and wrong', () => {
  assert.equal(judge('التنفس الخلوي', 'التنفّس الخلوي'), 'correct');
  assert.equal(judge('التنفس', 'التنفس الخلوي'), 'close');
  assert.equal(judge('النواة', 'التنفس الخلوي'), 'wrong');
  assert.equal(judge('photosynthesis', 'Photosynthesis.'), 'correct');
  assert.equal(judge('photosynthsis', 'photosynthesis'), 'correct');
});

test('splitIntoParts keeps sentences together and caps length', () => {
  const s = 'جملة أولى قصيرة. جملة ثانية قصيرة أيضاً. ' + 'كلمة '.repeat(70).trim() + '.';
  const parts = splitIntoParts(s, 30);
  assert.equal(parts[0], 'جملة أولى قصيرة. جملة ثانية قصيرة أيضاً.');
  for (const p of parts) assert.ok(p.split(/\s+/).length <= 30, p);
  assert.equal(parts.join(' ').split(/\s+/).length, s.split(/\s+/).length);
});

test('cleanOcrText joins wrapped lines and keeps paragraphs', () => {
  assert.equal(cleanOcrText('سطر أول\nيكمل هنا\n\nفقرة   ثانية\n'), 'سطر أول يكمل هنا\n\nفقرة ثانية');
});

test('detectLanguage', () => {
  assert.equal(detectLanguage('الخلية هي وحدة البناء'), 'ar');
  assert.equal(detectLanguage('The cell is the unit of life'), 'en');
});

test('cleanOcrText joins lines, drops direction marks and uses the Arabic comma', () => {
  const raw = 'الطلب هو الكمية\nالمطلوبة, وعندما ‎ينخفض‏ السعر.\n\nفقرة ثانية';
  assert.equal(cleanOcrText(raw), 'الطلب هو الكمية المطلوبة، وعندما ينخفض السعر.\n\nفقرة ثانية');
});

test('judge does not accept a whole paragraph for a short answer', () => {
  const answer = 'المستهلكون';
  const paragraph = 'الطلب في علم الاقتصاد هو الكمية التي يرغب المستهلكون في شرائها عند كل سعر';
  assert.equal(judge(paragraph, answer), 'wrong');
  assert.equal(judge('المستهلكين', answer), 'correct');
});
