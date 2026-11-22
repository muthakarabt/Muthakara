/**
 * Turns the text of a whole file (one string per page) into lessons and
 * question cards, without any AI: headings such as "الدرس الثاني" or
 * "Lecture 3" start a new lesson, and lines like "س١: … ج: …" or a line ending
 * in "؟" followed by its answer become question cards.
 */
import { cleanOcrText, splitIntoParts } from './text.ts';

export type Lesson = { title: string; text: string; parts: string[] };
export type FoundQuestion = { question: string; answer: string; lesson: string };
export type Organized = { lessons: Lesson[]; questions: FoundQuestion[] };

const HEADING =
  /^\s*(?:ال)?(?:درس|محاضرة|فصل|وحدة|باب|مبحث|موضوع|lecture|chapter|unit|lesson|section|topic)(?:\s|:|$)/i;
const NUMBERED_HEADING = /^\s*(?:\d+|[٠-٩]+)\s*[-.)]\s*\S.{0,50}$/u;
const Q_MARK = /^\s*(?:س|سؤال|السؤال|q|question)\s*(?:\d+|[٠-٩]+)?\s*[:：.)\-–/]\s*/iu;
const A_MARK = /^\s*(?:ج|جواب|الجواب|الإجابة|الاجابة|إجابة|اجابة|a|ans|answer)\s*(?:\d+|[٠-٩]+)?\s*[:：.)\-–/]\s*/iu;
const LIST_NUMBER = /^\s*(?:\d+|[٠-٩]+)\s*[-.)]\s*/u;

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || [...t].length > 70 || /[؟?]$/.test(t)) return false;
  return HEADING.test(t);
}

/** A short numbered line without a full stop also reads as a heading ("3- المرونة"). */
function isSoftHeading(line: string, next: string | undefined): boolean {
  const t = line.trim();
  return NUMBERED_HEADING.test(t) && !/[.،,؛:؟?]$/.test(t) && [...t].length <= 50 && !!next && [...next.trim()].length > 60;
}

function isQuestionLine(line: string): boolean {
  const t = line.trim();
  if (Q_MARK.test(t)) return true;
  // "1- ما هو قانون الطلب؟" or a plain line ending in a question mark.
  return /[؟?]\s*$/.test(t) && [...t].length <= 220 && [...t].length >= 6;
}

const strip = (line: string, mark: RegExp) => line.replace(mark, '').trim();

export function organize(pages: string[], pageLabel: (n: number) => string): Organized {
  const lessons: { title: string; lines: string[] }[] = [];
  const questions: FoundQuestion[] = [];
  let foundHeading = false;

  // Lines tagged with the page they came from.
  const lines: { text: string; page: number }[] = [];
  pages.forEach((p, i) => {
    for (const raw of p.split('\n')) lines.push({ text: raw.replace(/\s+/g, ' ').trim(), page: i + 1 });
  });

  type Draft = { title: string; lines: string[] };
  let current: Draft | null = null;
  let currentPage = 0;
  const startLesson = (title: string): Draft => {
    const l = { title, lines: [] };
    lessons.push(l);
    return l;
  };

  for (let i = 0; i < lines.length; i++) {
    const { text, page } = lines[i];
    if (!text) {
      current?.lines.push('');
      continue;
    }
    const next = lines.slice(i + 1).find((l) => l.text)?.text;

    if (isHeading(text) || (foundHeading && isSoftHeading(text, next))) {
      foundHeading = true;
      current = startLesson(text.replace(/[:：]\s*$/, ''));
      currentPage = page;
      continue;
    }
    // Without headings, each page is its own lesson.
    if (!foundHeading && page !== currentPage) {
      current = startLesson(pageLabel(page));
      currentPage = page;
    }
    current ??= startLesson(pageLabel(page));

    if (isQuestionLine(text) && !A_MARK.test(text)) {
      // Collect the rest of the question (when marked "س:" it may run over lines), then its answer.
      let question = strip(strip(text, Q_MARK), LIST_NUMBER);
      let j = i + 1;
      if (Q_MARK.test(text) && !/[؟?]\s*$/.test(text)) {
        while (j < lines.length && lines[j].text && !A_MARK.test(lines[j].text) && !/[؟?]\s*$/.test(question)) {
          question += ' ' + lines[j].text;
          j++;
        }
      }
      while (j < lines.length && !lines[j].text) j++;
      const answer: string[] = [];
      for (; j < lines.length; j++) {
        const t = lines[j].text;
        if (!t) {
          if (answer.length) break;
          continue;
        }
        if (isHeading(t) || (Q_MARK.test(t) && !A_MARK.test(t)) || (answer.length && isQuestionLine(t))) break;
        answer.push(answer.length === 0 ? strip(t, A_MARK) : t);
      }
      const a = answer.join(' ').trim();
      if (question && a) {
        questions.push({ question, answer: a, lesson: current.title });
        i = j - 1;
        continue;
      }
    }
    current.lines.push(text);
  }

  const out: Lesson[] = [];
  for (const l of lessons) {
    // Keep paragraph breaks (blank lines), join wrapped lines.
    const text = cleanOcrText(l.lines.join('\n').replace(/\n{3,}/g, '\n\n'));
    if (text.replace(/\s/g, '').length < 20) continue;
    out.push({ title: l.title, text, parts: splitIntoParts(text) });
  }
  return { lessons: out, questions };
}
