/**
 * Optional smarter questions with Google's Gemini API, using the user's own
 * free key (from Google AI Studio). Only used when the user adds a key and asks
 * for it; the text of the chosen parts is then sent to Google.
 */

export type AiQuestion = { question: string; answer: string };

export const AI_KEY_URL = 'https://aistudio.google.com/apikey';

// Newest first; older names are tried if Google retires or renames one.
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

export type AiErrorKind = 'key' | 'limit' | 'network' | 'other';

export class AiError extends Error {
  kind: AiErrorKind;
  constructor(kind: AiErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

function prompt(text: string, count: number, lang: 'ar' | 'en'): string {
  return lang === 'ar'
    ? `أنت معلم يساعد طالباً على المذاكرة. من النص التالي اكتب ${count} أسئلة متنوعة (تعريف، سبب، مقارنة، نتيجة، مثال، صح المعلومة) تغطي أهم ما فيه.
الجواب لكل سؤال قصير وواضح (من كلمة إلى جملتين) ومأخوذ من النص نفسه، باللغة العربية الفصحى البسيطة. لا تكرر نفس الفكرة.

النص:
${text}`
    : `You are a teacher helping a student study. From the text below write ${count} varied questions (definition, cause, comparison, result, example, key fact) covering its most important points.
Each answer is short and clear (a word to two sentences) and taken from the text itself. Do not repeat the same idea.

Text:
${text}`;
}

async function call(model: string, key: string, body: unknown): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
}

/** Reads the model's JSON answer into clean question/answer pairs. */
export function parseQuestions(raw: string): AiQuestion[] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  try {
    const list = JSON.parse(raw.slice(start, end + 1)) as unknown[];
    return list
      .map((q) => {
        const o = (q ?? {}) as Record<string, unknown>;
        return { question: String(o.question ?? '').trim(), answer: String(o.answer ?? '').trim() };
      })
      .filter((q) => q.question && q.answer);
  } catch {
    return [];
  }
}

export async function generateQuestions(key: string, text: string, lang: 'ar' | 'en', count = 5): Promise<AiQuestion[]> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt(text.slice(0, 12000), count, lang) }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { question: { type: 'STRING' }, answer: { type: 'STRING' } },
          required: ['question', 'answer'],
        },
      },
    },
  };
  for (const model of MODELS) {
    let res: Response;
    try {
      res = await call(model, key.trim(), body);
    } catch {
      throw new AiError('network');
    }
    if (res.ok) {
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return parseQuestions(raw);
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const err = await res.text();
      if (/API_KEY|api key|permission/i.test(err)) throw new AiError('key');
    }
    if (res.status === 429) throw new AiError('limit');
    // 404: this model name is not available any more; try the next one.
  }
  throw new AiError('other');
}
