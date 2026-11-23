import { Platform } from 'react-native';

/**
 * Talks to Claude through the site's own Netlify Function (netlify/functions/claude.mts),
 * which holds the Anthropic API key. The app never sees the key: it only sends the
 * access code the user typed in settings.
 *
 * On the web the function lives on the same site. A phone build needs the full
 * address in EXPO_PUBLIC_AI_URL (for example https://your-site.netlify.app/.netlify/functions/claude).
 */
const ENDPOINT = process.env.EXPO_PUBLIC_AI_URL || (Platform.OS === 'web' ? '/.netlify/functions/claude' : '');

export type AiPart = { text: string; keywords: string; question: string };

/** Why a request failed, so the screen can say something useful. */
export type AiErrorCode = 'no_code' | 'code' | 'not_configured' | 'bad_key' | 'too_long' | 'busy' | 'refused' | 'network' | 'failed';

export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

export function aiAvailable(): boolean {
  return ENDPOINT !== '';
}

async function call<T>(mode: 'split' | 'notes', text: string, accessCode: string): Promise<T> {
  if (!accessCode.trim()) throw new AiError('no_code');
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-muthakara-code': accessCode.trim() },
      body: JSON.stringify({ mode, text }),
    });
  } catch {
    throw new AiError('network');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const known: AiErrorCode[] = ['code', 'not_configured', 'bad_key', 'too_long', 'busy', 'refused'];
    const code = data?.error;
    throw new AiError(known.includes(code) ? code : res.status === 404 ? 'not_configured' : 'failed');
  }
  return data as T;
}

/** Fixes OCR slips and splits a passage into parts, each with key words and a question. */
export async function aiSplit(text: string, accessCode: string): Promise<AiPart[]> {
  const { parts } = await call<{ parts: AiPart[] }>('split', text, accessCode);
  return parts;
}

/** Key words and a self-test question for one passage. */
export function aiNotes(text: string, accessCode: string): Promise<{ keywords: string; question: string }> {
  return call('notes', text, accessCode);
}
