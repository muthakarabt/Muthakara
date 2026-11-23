/**
 * Netlify Function: the only place that talks to the Claude API.
 *
 * The Anthropic API key lives in the Netlify environment variable
 * ANTHROPIC_API_KEY and never reaches the browser. Because the site is public,
 * every request must also carry the access code from MUTHAKARA_ACCESS_CODE
 * (the user types it once in the app's settings), so strangers cannot spend
 * the key's credit.
 *
 * POST /.netlify/functions/claude
 *   { "mode": "split", "text": "..." } → { "parts": [{ "text", "keywords", "question" }] }
 *   { "mode": "notes", "text": "..." } → { "keywords", "question" }
 * Header: x-muthakara-code: <access code>
 */
import Anthropic from '@anthropic-ai/sdk';
import { createHash, timingSafeEqual } from 'node:crypto';

const MODEL = 'claude-opus-5-5';
const MAX_CHARS = 8000;

const SPLIT_SYSTEM = `You help a student memorise study material with spaced repetition.
You receive one passage, in Arabic or English, often read from a photo by OCR, so it may contain recognition mistakes.

1. Fix obvious OCR mistakes (broken words, wrong letters, stray symbols). Do not paraphrase, summarise or add information: keep the author's wording.
2. Split the passage into short study parts of about 15 to 40 words. Break at sentence ends so each part reads on its own, and keep the original order. Together the parts must cover the whole passage.
3. For each part write:
   - "keywords": the 3 to 6 most important words or terms from that part, separated by " · ", copied as they appear in the part.
   - "question": one short question whose answer is the main fact of that part.
Write keywords and questions in the same language as the passage. For Arabic use clear Modern Standard Arabic.`;

const NOTES_SYSTEM = `You help a student memorise one short study passage (Arabic or English) with spaced repetition.
Write:
- "keywords": the 3 to 6 most important words or terms from the passage, separated by " · ", copied as they appear in it.
- "question": one short question whose answer is the main fact of the passage.
Use the same language as the passage. For Arabic use clear Modern Standard Arabic.`;

const NOTE_PROPS = {
  keywords: { type: 'string' },
  question: { type: 'string' },
} as const;

const SPLIT_SCHEMA = {
  type: 'object',
  properties: {
    parts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, ...NOTE_PROPS },
        required: ['text', 'keywords', 'question'],
        additionalProperties: false,
      },
    },
  },
  required: ['parts'],
  additionalProperties: false,
};

const NOTES_SCHEMA = {
  type: 'object',
  properties: NOTE_PROPS,
  required: ['keywords', 'question'],
  additionalProperties: false,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Constant-time comparison so the code can't be guessed character by character. */
function sameCode(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const accessCode = process.env.MUTHAKARA_ACCESS_CODE;
  if (!apiKey || !accessCode) {
    // Say which variable is missing (names only, never values) so setup problems are easy to spot.
    const missing = [!apiKey && 'ANTHROPIC_API_KEY', !accessCode && 'MUTHAKARA_ACCESS_CODE'].filter(Boolean);
    console.error('Missing environment variables:', missing.join(', '));
    return json(503, { error: 'not_configured', missing });
  }
  if (!sameCode(req.headers.get('x-muthakara-code') ?? '', accessCode)) return json(401, { error: 'code' });

  let body: { mode?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_request' });
  }
  const mode = body.mode === 'notes' ? 'notes' : body.mode === 'split' ? 'split' : null;
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!mode || !text) return json(400, { error: 'bad_request' });
  if (text.length > MAX_CHARS) return json(413, { error: 'too_long' });

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 50_000 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Low effort keeps the reply fast enough for a function call; the task is simple.
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: mode === 'split' ? SPLIT_SCHEMA : NOTES_SCHEMA },
      },
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: mode === 'split' ? SPLIT_SYSTEM : NOTES_SYSTEM,
      messages: [{ role: 'user', content: `<passage>\n${text}\n</passage>` }],
    });

    if (response.stop_reason === 'refusal') return json(422, { error: 'refused' });
    if (response.stop_reason === 'max_tokens') return json(413, { error: 'too_long' });

    const out = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const data = JSON.parse(out);
    if (mode === 'split') {
      const parts = (data.parts as { text: string; keywords: string; question: string }[])
        .map((p) => ({ text: p.text.trim(), keywords: p.keywords.trim(), question: p.question.trim() }))
        .filter((p) => p.text);
      return json(200, { parts });
    }
    return json(200, { keywords: String(data.keywords).trim(), question: String(data.question).trim() });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error('Anthropic rejected the API key', error.status);
      return json(503, { error: 'bad_key' });
    }
    if (error instanceof Anthropic.RateLimitError) return json(429, { error: 'busy' });
    if (error instanceof Anthropic.APIError) {
      console.error('Claude API error', error.status, error.message);
      return json(502, { error: 'failed' });
    }
    console.error('Claude call failed', error);
    return json(502, { error: 'failed' });
  }
};
