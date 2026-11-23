/**
 * Reads Arabic and English text from a page photo in the browser using
 * Tesseract. The engine, language files and the shared preparation step
 * (public/ocr-pipeline.js) are served from this site, so nothing is sent to
 * any outside server.
 */
import type { ReactNode } from 'react';

export type PdfText = { pages: string[]; total: number };
export type PdfProgress = (done: number, page: number) => void;

type Pipeline = {
  recognize: (src: string, onProgress?: (p: number) => void) => Promise<string>;
  readPdf: (src: string, onProgress?: PdfProgress) => Promise<PdfText>;
};

export type OcrStatus = 'loading' | 'ready' | 'failed';

let pipelinePromise: Promise<Pipeline> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(el);
  });
}

function getPipeline(): Promise<Pipeline> {
  const w = window as unknown as { MuthakaraOCR?: Pipeline; Tesseract?: unknown };
  pipelinePromise ??= (async () => {
    if (!w.Tesseract) await loadScript('/ocr/tesseract.min.js');
    if (!w.MuthakaraOCR) await loadScript('/ocr-pipeline.js');
    if (!w.MuthakaraOCR) throw new Error('OCR pipeline missing');
    return w.MuthakaraOCR;
  })().catch((e) => {
    pipelinePromise = null; // allow a retry later
    throw e;
  });
  return pipelinePromise;
}

/** Returns the recognised text; `onProgress` gets 0..1 while the page is read. */
async function recognize(uri: string, onProgress?: (p: number) => void): Promise<string> {
  const pipeline = await getPipeline();
  return pipeline.recognize(uri, onProgress);
}

/** Reads the text of every page of a PDF (scanned pages are read like photos). */
async function readPdf(uri: string, onProgress?: PdfProgress): Promise<PdfText> {
  const pipeline = await getPipeline();
  return pipeline.readPdf(uri, onProgress);
}

/** Same shape as the phone version; on the web nothing extra needs rendering. */
export function useOcr(): {
  status: OcrStatus;
  recognize: (uri: string, onProgress?: (p: number) => void) => Promise<string>;
  readPdf: (uri: string, onProgress?: PdfProgress) => Promise<PdfText>;
  element: ReactNode;
} {
  return { status: 'ready', recognize, readPdf, element: null };
}
