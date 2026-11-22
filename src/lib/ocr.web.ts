/**
 * Reads Arabic and English text from a page photo in the browser using
 * Tesseract. The engine and language files are served from /ocr (copied there
 * by scripts/copy-ocr-assets.js), so nothing is sent to any outside server.
 */
type TesseractWorker = {
  recognize: (image: string) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};
type TesseractGlobal = {
  createWorker: (
    langs: string,
    oem: number,
    options: Record<string, unknown>,
  ) => Promise<TesseractWorker>;
};

export const ocrAvailable = true;

let scriptPromise: Promise<TesseractGlobal> | null = null;
let workerPromise: Promise<TesseractWorker> | null = null;
let progressListener: ((p: number) => void) | null = null;

function loadScript(): Promise<TesseractGlobal> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const w = window as unknown as { Tesseract?: TesseractGlobal };
    if (w.Tesseract) return resolve(w.Tesseract);
    const el = document.createElement('script');
    el.src = '/ocr/tesseract.min.js';
    el.async = true;
    el.onload = () => (w.Tesseract ? resolve(w.Tesseract) : reject(new Error('Tesseract missing')));
    el.onerror = () => reject(new Error('Could not load OCR engine'));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

function getWorker(): Promise<TesseractWorker> {
  workerPromise ??= loadScript()
    .then((T) =>
      T.createWorker('ara+eng', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/',
        langPath: '/ocr',
        gzip: false,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') progressListener?.(m.progress);
        },
      }),
    )
    .catch((e) => {
      workerPromise = null; // allow a retry later
      scriptPromise = null;
      throw e;
    });
  return workerPromise;
}

/**
 * Tesseract reads best when letters are about 30–40px tall. Screenshots and
 * small photos are scaled up (and very large photos down) and turned grey first.
 */
async function prepare(uri: string): Promise<string> {
  const img = new Image();
  img.src = uri;
  await img.decode();
  const scale = Math.min(3, Math.max(0.5, 2400 / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return uri;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'grayscale(1) contrast(1.15)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Returns the recognised text; `onProgress` gets 0..1 while the page is read. */
export async function recognizeText(uri: string, onProgress?: (p: number) => void): Promise<string> {
  const worker = await getWorker();
  progressListener = onProgress ?? null;
  try {
    let image = uri;
    try {
      image = await prepare(uri);
    } catch {
      // fall back to the original picture
    }
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    progressListener = null;
  }
}
