/**
 * Reading text from photos. On phones there is no free offline Arabic OCR that
 * works without a custom build, so the user pastes or types the text instead.
 * The web version (ocr.web.ts) runs Tesseract in the browser.
 */
export const ocrAvailable = false;

export async function recognizeText(_uri: string, _onProgress?: (p: number) => void): Promise<string> {
  throw new Error('OCR is not available on this platform');
}
