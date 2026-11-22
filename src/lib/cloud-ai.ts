/**
 * The app's built-in AI (see netlify/functions/ai.mts): Claude reads photos and
 * writes questions with the app's own key, so users need no account or key.
 * Every failure (offline, daily allowance used up, service off) is an AiError,
 * and the callers fall back to the free on-device reading.
 */
import { Platform } from 'react-native';

import { AiError, type AiQuestion } from '@/lib/ai';
import type { ImageData } from '@/lib/claude';
import { OCR_ORIGIN } from '@/lib/ocr';

// The web app calls its own site; the phone app calls the deployed one.
const PATH = '/.netlify/functions/ai';
const ENDPOINT = Platform.OS === 'web' ? PATH : `${OCR_ORIGIN}${PATH}`;

export function newDeviceId(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}${rand()}`;
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiError('network');
  }
  if (res.status === 429) throw new AiError('limit');
  if (!res.ok) throw new AiError('other');
  try {
    return (await res.json()) as T;
  } catch {
    // e.g. the local dev server answering with the app's own page
    throw new AiError('other');
  }
}

export async function cloudRead(device: string, image: ImageData): Promise<string> {
  const { text } = await post<{ text?: string }>({ action: 'read', device, image });
  if (typeof text !== 'string') throw new AiError('other');
  return text;
}

export async function cloudQuestions(
  device: string,
  text: string,
  lang: 'ar' | 'en',
  count: number,
): Promise<AiQuestion[]> {
  const { questions } = await post<{ questions?: AiQuestion[] }>({ action: 'questions', device, text, lang, count });
  if (!Array.isArray(questions)) throw new AiError('other');
  return questions;
}
