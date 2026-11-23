import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseQuestions } from './ai.ts';

test('parseQuestions reads the JSON list and drops incomplete items', () => {
  const raw = 'here:\n[{"question":"ما هو الطلب؟","answer":"الكمية المرغوبة"},{"question":"","answer":"x"},{"question":"q"}]';
  assert.deepEqual(parseQuestions(raw), [{ question: 'ما هو الطلب؟', answer: 'الكمية المرغوبة' }]);
  assert.deepEqual(parseQuestions('not json'), []);
});
