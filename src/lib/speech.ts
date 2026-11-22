import * as Speech from 'expo-speech';

import { detectLanguage } from '@/lib/text';

type Voice = Speech.Voice;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

let cachedVoices: Voice[] | null = null;

/** Browsers fill the voice list a moment after the page loads, so ask a few times. */
async function loadVoices(): Promise<Voice[]> {
  if (cachedVoices?.length) return cachedVoices;
  for (let i = 0; i < 4; i++) {
    const voices = await withTimeout(Speech.getAvailableVoicesAsync().catch(() => []), 1500, [] as Voice[]);
    if (voices.length) {
      cachedVoices = voices;
      return voices;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return [];
}

/** The best installed voice for the language, or null when the device has none. */
export async function findVoice(lang: 'ar' | 'en'): Promise<Voice | null> {
  const voices = (await loadVoices()).filter((v) => v.language?.toLowerCase().replace('_', '-').startsWith(lang));
  if (!voices.length) return null;
  const score = (v: Voice) =>
    (v.quality === Speech.VoiceQuality.Enhanced ? 4 : 0) +
    (/natural|neural|online|premium|enhanced/i.test(v.name) ? 3 : 0) +
    (lang === 'ar' && /sa/i.test(v.language) ? 1 : 0) +
    (lang === 'en' && /us|gb/i.test(v.language) ? 1 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

/** Splits a passage into sentences: short utterances sound more natural and avoid browser cut-offs. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟؛;:،,])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reads a passage aloud `repeats` times with a short pause between readings.
 * Calls onRepeat(i) when reading i (1-based) starts and onDone at the end.
 * Returns a function that stops reading.
 */
export function readAloud(
  text: string,
  opts: { repeats: number; voice?: Voice | null; onRepeat?: (i: number) => void; onDone?: () => void },
): () => void {
  const lang = detectLanguage(text);
  const parts = sentences(text);
  let stopped = false;
  let pause: ReturnType<typeof setTimeout> | undefined;

  const sayPart = (round: number, index: number) => {
    if (stopped) return;
    if (index === 0) opts.onRepeat?.(round);
    const next = () => {
      if (stopped) return;
      if (index + 1 < parts.length) sayPart(round, index + 1);
      else if (round < opts.repeats) pause = setTimeout(() => sayPart(round + 1, 0), 1200);
      else opts.onDone?.();
    };
    Speech.speak(parts[index], {
      language: opts.voice?.language ?? (lang === 'ar' ? 'ar-SA' : 'en-US'),
      voice: opts.voice?.identifier,
      rate: lang === 'ar' ? 0.85 : 0.92,
      onDone: next,
      onStopped: () => {},
      onError: next,
    });
  };

  if (!parts.length) {
    opts.onDone?.();
    return () => {};
  }
  Speech.stop()
    .catch(() => {})
    .finally(() => sayPart(1, 0));

  return () => {
    stopped = true;
    if (pause) clearTimeout(pause);
    Speech.stop().catch(() => {});
  };
}

export function stopReading(): void {
  Speech.stop().catch(() => {});
}
