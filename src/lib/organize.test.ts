import assert from 'node:assert/strict';
import { test } from 'node:test';

import { organize } from './organize.ts';

const label = (n: number) => `صفحة ${n}`;

test('headings start lessons and marked questions become cards', () => {
  const pages = [
    `المحاضرة الأولى: العرض والطلب
الطلب هو الكميات التي يرغب المستهلك في شرائها ويقدر على دفع ثمنها عند الأسعار المختلفة.
وينص قانون الطلب على وجود علاقة عكسية بين السعر والكمية المطلوبة.

س1: ما هو قانون الطلب؟
ج: علاقة عكسية بين السعر والكمية المطلوبة.`,
    `المحاضرة الثانية: المرونة
المرونة تقيس مدى استجابة الكمية المطلوبة للتغير في السعر، وتكون مرنة إذا كانت أكبر من واحد.
س2: متى يكون الطلب مرناً؟
ج: إذا كانت المرونة أكبر من واحد.`,
  ];
  const r = organize(pages, label);
  assert.deepEqual(
    r.lessons.map((l) => l.title),
    ['المحاضرة الأولى: العرض والطلب', 'المحاضرة الثانية: المرونة'],
  );
  assert.equal(r.questions.length, 2);
  assert.deepEqual(r.questions[0], {
    question: 'ما هو قانون الطلب؟',
    answer: 'علاقة عكسية بين السعر والكمية المطلوبة.',
    lesson: 'المحاضرة الأولى: العرض والطلب',
  });
  assert.equal(r.questions[1].lesson, 'المحاضرة الثانية: المرونة');
  // Questions are taken out of the lesson text.
  assert.ok(!r.lessons[0].text.includes('س1'));
  assert.ok(r.lessons[0].parts.length >= 1);
});

test('a numbered question line followed by its answer', () => {
  const r = organize(['أسئلة مهمة للاختبار\n1- عرّف السعر التوازني؟\nهو السعر الذي تتساوى عنده الكمية المطلوبة والمعروضة.\n\n2- ما أثر الإحلال؟\nانتقال المستهلك إلى سلعة أرخص.'], label);
  assert.equal(r.questions.length, 2);
  assert.equal(r.questions[0].question, 'عرّف السعر التوازني؟');
  assert.equal(r.questions[1].answer, 'انتقال المستهلك إلى سلعة أرخص.');
});

test('without headings each page is a lesson', () => {
  const long = 'هذا نص طويل بما يكفي ليصبح درساً كاملاً ويقسم إلى أجزاء صغيرة للمذاكرة اليومية.';
  const r = organize([long, long, ''], label);
  assert.deepEqual(
    r.lessons.map((l) => l.title),
    ['صفحة 1', 'صفحة 2'],
  );
});

test('English lecture notes with Q/A', () => {
  const r = organize(
    ['Lecture 4: Cells\nThe mitochondria produce energy for the cell through respiration.\nQ: What do mitochondria do?\nA: They produce energy.'],
    label,
  );
  assert.equal(r.lessons[0].title, 'Lecture 4: Cells');
  assert.deepEqual(r.questions[0], { question: 'What do mitochondria do?', answer: 'They produce energy.', lesson: 'Lecture 4: Cells' });
});
