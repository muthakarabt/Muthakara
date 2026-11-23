/**
 * Reading text from photos in the phone app. There is no free offline Arabic
 * OCR for Expo Go, so the app opens the web app's OCR page (the same
 * self-hosted Tesseract engine) in a hidden WebView, sends it the photo and gets
 * the text back. It needs an internet connection the first time the engine
 * loads; nothing is sent anywhere except to the app's own website.
 */
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

// The package's class typings don't line up with React 19's JSX types.
type WebViewHandle = { injectJavaScript: (script: string) => void };
const HiddenWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

/** Where the web version (and its OCR page) is published. */
export const OCR_ORIGIN = 'https://muthakara.netlify.app';

export type OcrStatus = 'loading' | 'ready' | 'failed';

export type PdfText = { pages: string[]; total: number };
export type PdfProgress = (done: number, page: number) => void;

type Pending = {
  resolve: (value: never) => void;
  reject: (e: Error) => void;
  onProgress?: (p: number, page: number) => void;
};

/** Bigger files are too much to hand to the reading page in one go. */
const MAX_PDF_BYTES = 15 * 1024 * 1024;

export function useOcr(): {
  status: OcrStatus;
  recognize: (uri: string, onProgress?: (p: number) => void) => Promise<string>;
  /** Reads the text of every page of a PDF (scanned pages are read like photos). */
  readPdf: (uri: string, onProgress?: PdfProgress) => Promise<PdfText>;
  /** Must be rendered for OCR to work (it is invisible). */
  element: ReactNode;
} {
  const [status, setStatus] = useState<OcrStatus>('loading');
  const web = useRef<WebViewHandle>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: {
      type: string;
      id?: number;
      text?: string;
      progress?: number;
      page?: number;
      pages?: string[];
      total?: number;
      error?: string;
    };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setStatus('ready');
    else if (msg.type === 'failed') setStatus('failed');
    const job = msg.id !== undefined ? pending.current.get(msg.id) : undefined;
    if (!job) return;
    if (msg.type === 'progress') job.onProgress?.(msg.progress ?? 0, msg.page ?? 0);
    if (msg.type === 'result' || msg.type === 'pdf' || msg.type === 'error') {
      pending.current.delete(msg.id!);
      if (msg.type === 'result') (job.resolve as (t: string) => void)(msg.text ?? '');
      else if (msg.type === 'pdf') (job.resolve as (r: PdfText) => void)({ pages: msg.pages ?? [], total: msg.total ?? 0 });
      else job.reject(new Error(msg.error));
    }
  }, []);

  const recognize = useCallback(async (uri: string, onProgress?: (p: number) => void) => {
    // Phone photos are large; a 2000px-wide JPEG keeps the text sharp and the transfer small.
    const ref = await ImageManipulator.manipulate(uri).resize({ width: 2000 }).renderAsync();
    const saved = await ref.saveAsync({ base64: true, compress: 0.92, format: SaveFormat.JPEG });
    const id = nextId.current++;
    return new Promise<string>((resolve, reject) => {
      pending.current.set(id, { resolve: resolve as (v: never) => void, reject, onProgress });
      const payload = JSON.stringify({ id, image: `data:image/jpeg;base64,${saved.base64}` });
      web.current?.injectJavaScript(`window.__ocr && window.__ocr(${payload}); true;`);
      setTimeout(() => {
        if (pending.current.delete(id)) reject(new Error('OCR timed out'));
      }, 120000);
    });
  }, []);

  const readPdf = useCallback(async (uri: string, onProgress?: PdfProgress) => {
    const file = new File(uri);
    if (file.size > MAX_PDF_BYTES) throw new Error('too-big');
    const data = await file.base64();
    const id = nextId.current++;
    return new Promise<PdfText>((resolve, reject) => {
      pending.current.set(id, { resolve: resolve as (v: never) => void, reject, onProgress });
      const payload = JSON.stringify({ id, data: `data:application/pdf;base64,${data}` });
      web.current?.injectJavaScript(`window.__pdf && window.__pdf(${payload}); true;`);
      // Scanned pages take a while each; allow plenty of time for a long file.
      setTimeout(() => {
        if (pending.current.delete(id)) reject(new Error('PDF reading timed out'));
      }, 30 * 60_000);
    });
  }, []);

  const element = (
    <View style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }} pointerEvents="none">
      <HiddenWebView
        ref={web}
        source={{ uri: `${OCR_ORIGIN}/ocr-frame.html` }}
        onMessage={onMessage}
        onError={() => setStatus('failed')}
        onHttpError={() => setStatus('failed')}
        javaScriptEnabled
        originWhitelist={['https://*']}
      />
    </View>
  );

  return { status, recognize, readPdf, element };
}
