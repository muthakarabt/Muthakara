import * as Speech from 'expo-speech';

import { detectLanguage } from '@/lib/text';

/** True when the device seems to have a voice for the language (unknown counts as yes). */
export async function hasVoice(lang: 'ar' | 'en'): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices.length) return true; // some browsers load voices lazily; just try
    return voices.some((v) => v.language?.toLowerCase().startsWith(lang));
  } catch {
    return true;
  }
}

/**
 * Reads a passage aloud `repeats` times with a short pause between readings.
 * Calls onRepeat(i) when reading i (1-based) starts and onDone at the end.
 * Returns a function that stops reading.
 */
export function readAloud(
  text: string,
  opts: { repeats: number; onRepeat?: (i: number) => void; onDone?: () => void },
): () => void {
  const lang = detectLanguage(text);
  let stopped = false;
  let pause: ReturnType<typeof setTimeout> | undefined;

  const say = (i: number) => {
    if (stopped) return;
    opts.onRepeat?.(i);
    Speech.speak(text, {
      language: lang === 'ar' ? 'ar-SA' : 'en-US',
      rate: lang === 'ar' ? 0.85 : 0.92,
      onDone: () => {
        if (stopped) return;
        if (i < opts.repeats) pause = setTimeout(() => say(i + 1), 900);
        else opts.onDone?.();
      },
      onError: () => {
        if (!stopped) opts.onDone?.();
      },
    });
  };

  Speech.stop()
    .catch(() => {})
    .finally(() => say(1));

  return () => {
    stopped = true;
    if (pause) clearTimeout(pause);
    Speech.stop().catch(() => {});
  };
}

export function stopReading(): void {
  Speech.stop().catch(() => {});
}
