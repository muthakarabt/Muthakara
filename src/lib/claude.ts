/**
 * Optional: Claude reads page photos directly (far better than on-device OCR
 * for Arabic) and writes study questions. Uses the user's own Anthropic API key,
 * kept in Settings on their device; the photo or text is sent to Anthropic only
 * when one of these functions runs.
 */
import { AiError, type AiQuestion } from './ai';

export const CLAUDE_KEY_URL = 'https://console.anthropic.com/settings/keys';

export type ClaudeModel = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5';
export const CLAUDE_MODELS: ClaudeModel[] = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

export function isClaudeKey(key: string): boolean {
  return key.trim().startsWith('sk-ant-');
}

/**
 * Plain HTTP rather than the official SDK: the SDK's modules have an import
 * cycle that crashes the app at startup under Metro (React Native / Expo web).
 */
async function callClaude(key: string, model: ClaudeModel, body: Record<string, unknown>): Promise<string> {
  // Opus and Sonnet: if a safety check declines, let the API retry on a fallback model it picks.
  const fallback = model !== 'claude-haiku-5-5';
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key.trim(),
        'anthropic-version': '2026-10-21',
        // The key is the user's own and stays on their device, so calling from the app is intended.
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
      },
      body: JSON.stringify({ model, max_tokens: 8000, ...(fallback ? { fallbacks: 'default' } : {}), ...body }),
    });
  } catch {
    throw new AiError('network');
  }
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401 || res.status === 403) throw new AiError('key');
    if (res.status === 429 || res.status === 529) throw new AiError('limit');
    if (res.status === 400 && /credit balance/i.test(err)) throw new AiError('credit');
    throw new AiError('other');
  }
  const data = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  if (data.stop_reason === 'refusal') throw new AiError('other');
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export type ImageData = { mediaType: 'image/jpeg' | 'image/png'; base64: string };

const PAGE_SCHEMA = {
  type: 'object',
  properties: { text: { type: 'string' } },
  required: ['text'],
  additionalProperties: false,
};

/** Reads all the text on a page photo, in reading order. */
export async function readPhoto(key: string, model: ClaudeModel, image: ImageData): Promise<string> {
  const raw = await callClaude(key, model, {
    output_config: { effort: 'low', format: { type: 'json_schema', schema: PAGE_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
          {
            type: 'text',
            text:
              'Transcribe all the text in this photo of a study page exactly as written, in reading order. ' +
              'Keep the original language and spelling (Arabic stays Arabic), keep line breaks between paragraphs, ' +
              'and leave out page numbers, headers/footers and anything that is not part of the content. ' +
              'If there is no readable text, return an empty string.',
          },
        ],
      },
    ],
  });
  return parseJson<{ text: string }>(raw)?.text ?? '';
}

const QUESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
        required: ['question', 'answer'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

/** Writes varied study questions with short answers taken from the text. */
export async function writeQuestions(
  key: string,
  model: ClaudeModel,
  text: string,
  lang: 'ar' | 'en',
  count: number,
): Promise<AiQuestion[]> {
  const ask =
    lang === 'ar'
      ? `أنت معلم يساعد طالباً على المذاكرة. من النص التالي اكتب ${count} أسئلة متنوعة (تعريف، سبب، مقارنة، نتيجة، مثال، معلومة مهمة) تغطي أهم ما فيه، كما قد تأتي في الاختبار.
الجواب لكل سؤال قصير وواضح (من كلمة إلى جملتين) ومأخوذ من النص نفسه فقط، بالعربية. لا تكرر نفس الفكرة ولا تسأل عن شيء غير موجود في النص.`
      : `You are a teacher helping a student study. From the text below write ${count} varied questions (definition, cause, comparison, result, example, key fact) covering its most important points, as they might appear in an exam.
Each answer is short and clear (a word to two sentences) and taken only from the text. Do not repeat an idea or ask about anything not in the text.`;
  const raw = await callClaude(key, model, {
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: QUESTIONS_SCHEMA } },
    messages: [{ role: 'user', content: `${ask}\n\n<text>\n${text}\n</text>` }],
  });
  return (parseJson<{ questions: AiQuestion[] }>(raw)?.questions ?? [])
    .map((q) => ({ question: String(q.question ?? '').trim(), answer: String(q.answer ?? '').trim() }))
    .filter((q) => q.question && q.answer);
}
