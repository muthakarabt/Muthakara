/**
 * The app's built-in AI, at /.netlify/functions/ai: reads page photos and writes study questions with
 * Claude, using the app owner's Anthropic key (the ANTHROPIC_API_KEY environment
 * variable in Netlify). Users never see the key and need no account of their own.
 *
 * There is no everyday limit for people. Only abuse is stopped: a device or
 * internet address sending far more than any person could (a script sending
 * photos in a loop) is paused until the next day, and the app then reads
 * photos on the device instead. An optional ceiling for the whole app exists too.
 *
 * Usage page for the owner: open /.netlify/functions/ai?token=YOUR_ADMIN_TOKEN
 *
 * Settings (Netlify environment variables, all optional except the key):
 *   ANTHROPIC_API_KEY   the key from console.anthropic.com
 *   ADMIN_TOKEN         a password of your choice for the usage page
 *   AI_MODEL            default claude-haiku-5-5
 *   AI_DEVICE_DAILY     requests per device per day, default 2000
 *   AI_IP_DAILY         requests per internet address per day, default 5000
 *   AI_TOTAL_DAILY      requests for the whole app per day, default none
 */
import { getStore } from '@netlify/blobs';

import { AiError } from '../../src/lib/ai.ts';
import { readPhoto, writeQuestions, type ClaudeModel, type ImageData } from '../../src/lib/claude.ts';

type Body =
  | { action: 'read'; device: string; image: ImageData }
  | { action: 'questions'; device: string; text: string; lang: 'ar' | 'en'; count: number };

const num = (name: string, fallback: number) => Number(process.env[name]) || fallback;

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // The phone app calls from its own (non-web) origin.
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'cross-origin-resource-policy': 'cross-origin',
    },
  });
}

/** Adds one use to each counter, or returns false if any is already full (0 = no limit). */
async function take(keys: [string, number][]): Promise<boolean> {
  const store = getStore('ai-usage');
  const counts = await Promise.all(keys.map(([k]) => store.get(k).then((v) => Number(v) || 0)));
  if (counts.some((n, i) => keys[i][1] > 0 && n >= keys[i][1])) return false;
  // Not atomic: a few requests at the same instant may slip past a limit, which is fine here.
  await Promise.all(keys.map(([k], i) => store.set(k, String(counts[i] + 1))));
  return true;
}

// Rough cost per request with Haiku (a page photo, or a batch of questions), in US dollars.
const COST = { read: 0.0006, questions: 0.001 };

async function usagePage(token: string | null): Promise<Response> {
  const admin = process.env.ADMIN_TOKEN;
  if (!admin || token !== admin) return new Response('Not found', { status: 404 });
  const store = getStore('ai-usage');
  const rows: string[] = [];
  let monthCost = 0;
  for (let i = 0; i < 30; i++) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const [reads, questions, devices] = await Promise.all([
      store.get(`${day}/read`).then((v) => Number(v) || 0),
      store.get(`${day}/questions`).then((v) => Number(v) || 0),
      store.list({ prefix: `${day}/device/` }).then((r) => r.blobs.length),
    ]);
    const cost = reads * COST.read + questions * COST.questions;
    monthCost += cost;
    if (i < 14 || reads || questions)
      rows.push(`<tr><td>${day}</td><td>${devices}</td><td>${reads}</td><td>${questions}</td><td>$${cost.toFixed(2)}</td></tr>`);
  }
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>استخدام الذكاء الاصطناعي</title><style>body{font-family:system-ui;margin:16px;background:#f7f5ef;color:#1d2b25}
table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:8px;border-bottom:1px solid #e5e0d5;text-align:center}
th{background:#1f6f5c;color:#fff}.big{font-size:22px;font-weight:700}</style></head><body>
<h2>استخدام الذكاء الاصطناعي</h2>
<p class="big">تقريباً $${monthCost.toFixed(2)} آخر 30 يوم</p>
<p>تقدير تقريبي. الرقم الدقيق في console.anthropic.com ← Usage.</p>
<table><tr><th>اليوم (UTC)</th><th>أجهزة</th><th>صور</th><th>دفعات أسئلة</th><th>التكلفة</th></tr>${rows.join('')}</table>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return reply(204, null);
  if (req.method === 'GET') return usagePage(new URL(req.url).searchParams.get('token'));
  if (req.method !== 'POST') return reply(405, { error: 'method' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return reply(503, { error: 'off' });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return reply(400, { error: 'bad' });
  }
  const device = String(body?.device ?? '').replace(/[^\w-]/g, '').slice(0, 64);
  if (!device) return reply(400, { error: 'bad' });
  if (body.action === 'read' && !(body.image?.base64 && /^image\/(jpeg|png)$/.test(body.image.mediaType)))
    return reply(400, { error: 'bad' });
  if (body.action === 'questions' && !(typeof body.text === 'string' && body.text.trim()))
    return reply(400, { error: 'bad' });
  if (body.action !== 'read' && body.action !== 'questions') return reply(400, { error: 'bad' });

  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get('x-nf-client-connection-ip') ?? 'unknown').replace(/[^\w.:-]/g, '');
  const allowed = await take([
    [`${day}/total`, num('AI_TOTAL_DAILY', 0)],
    [`${day}/${body.action}`, 0],
    [`${day}/ip/${ip}`, num('AI_IP_DAILY', 5000)],
    [`${day}/device/${device}`, num('AI_DEVICE_DAILY', 2000)],
  ]);
  if (!allowed) return reply(429, { error: 'limit' });

  const model = (process.env.AI_MODEL || 'claude-haiku-5-5') as ClaudeModel;
  try {
    if (body.action === 'read') {
      return reply(200, { text: await readPhoto(key, model, body.image) });
    }
    const count = Math.max(1, Math.min(10, Number(body.count) || 5));
    const lang = body.lang === 'en' ? 'en' : 'ar';
    return reply(200, { questions: await writeQuestions(key, model, body.text.slice(0, 12000), lang, count) });
  } catch (e) {
    const kind = e instanceof AiError ? e.kind : 'other';
    console.error('claude call failed:', kind);
    // The owner's credit or key problems are not the user's to fix: show them as "busy".
    return reply(kind === 'limit' ? 429 : 502, { error: kind === 'limit' ? 'limit' : 'busy' });
  }
};
