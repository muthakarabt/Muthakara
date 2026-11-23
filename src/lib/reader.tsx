/**
 * Reads text from page photos, best option first:
 *   1. the user's own Claude key, if they added one in Settings;
 *   2. the app's built-in AI (Claude through the app's server), unless turned off;
 *   3. the free on-device OCR, which is also the fallback whenever 1 or 2 fails
 *      (no internet, daily allowance used up).
 */
import { useCallback } from 'react';

import { useApp } from '@/lib/app-context';
import { isClaudeKey, readPhoto } from '@/lib/claude';
import { cloudRead } from '@/lib/cloud-ai';
import { toImageData } from '@/lib/image-data';
import { useOcr } from '@/lib/ocr';

export function useReader() {
  const { settings } = useApp();
  const ocr = useOcr();
  const { aiKey, aiModel, aiCloud, deviceId } = settings;
  const ownKey = isClaudeKey(aiKey);
  const smart = ownKey || aiCloud;
  const { recognize: ocrRecognize } = ocr;

  const recognize = useCallback(
    async (uri: string, onProgress?: (p: number) => void): Promise<string> => {
      if (!smart) return ocrRecognize(uri, onProgress);
      try {
        onProgress?.(0.15);
        const image = await toImageData(uri);
        const text = ownKey ? await readPhoto(aiKey, aiModel, image) : await cloudRead(deviceId, image);
        onProgress?.(1);
        return text;
      } catch {
        return ocrRecognize(uri, onProgress);
      }
    },
    [smart, ownKey, aiKey, aiModel, deviceId, ocrRecognize],
  );

  return {
    // The AI needs no engine to load first (OCR keeps loading in the background as the fallback).
    status: smart ? ('ready' as const) : ocr.status,
    recognize,
    readPdf: ocr.readPdf,
    element: ocr.element,
    usingClaude: smart,
  };
}
