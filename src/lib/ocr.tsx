/**
 * Reading text from photos in the phone app. There is no free offline Arabic
 * OCR for Expo Go, so the app opens the web app's OCR page (the same
 * self-hosted Tesseract engine) in a hidden WebView, sends it the photo and gets
 * the text back. It needs an internet connection the first time the engine
 * loads; nothing is sent anywhere except to the app's own website.
 */
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

type Pending = { resolve: (text: string) => void; reject: (e: Error) => void; onProgress?: (p: number) => void };

export function useOcr(): {
  status: OcrStatus;
  recognize: (uri: string, onProgress?: (p: number) => void) => Promise<string>;
  /** Must be rendered for OCR to work (it is invisible). */
  element: ReactNode;
} {
  const [status, setStatus] = useState<OcrStatus>('loading');
  const web = useRef<WebViewHandle>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: { type: string; id?: number; text?: string; progress?: number; error?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setStatus('ready');
    else if (msg.type === 'failed') setStatus('failed');
    const job = msg.id !== undefined ? pending.current.get(msg.id) : undefined;
    if (!job) return;
    if (msg.type === 'progress') job.onProgress?.(msg.progress ?? 0);
    if (msg.type === 'result' || msg.type === 'error') {
      pending.current.delete(msg.id!);
      if (msg.type === 'result') job.resolve(msg.text ?? '');
      else job.reject(new Error(msg.error));
    }
  }, []);

  const recognize = useCallback(async (uri: string, onProgress?: (p: number) => void) => {
    // Phone photos are large; a 2000px-wide JPEG keeps the text sharp and the transfer small.
    const ref = await ImageManipulator.manipulate(uri).resize({ width: 2000 }).renderAsync();
    const saved = await ref.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
    const id = nextId.current++;
    return new Promise<string>((resolve, reject) => {
      pending.current.set(id, { resolve, reject, onProgress });
      const payload = JSON.stringify({ id, image: `data:image/jpeg;base64,${saved.base64}` });
      web.current?.injectJavaScript(`window.__ocr && window.__ocr(${payload}); true;`);
      setTimeout(() => {
        if (pending.current.delete(id)) reject(new Error('OCR timed out'));
      }, 120000);
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

  return { status, recognize, element };
}
