import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

function mediaDir(): Directory {
  const dir = new Directory(Paths.document, 'media');
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/** Reads a blob: or data: uri into a self-contained data: uri (web only). */
async function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Copies a picked file into the app's own storage so it survives cache cleanup.
 * On web, picked files are temporary blob: links that die on reload, so the
 * file is stored inline as a data: uri in the database instead.
 */
export async function persistFile(uri: string, extension: string): Promise<string> {
  if (Platform.OS === 'web') return toDataUri(uri);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const target = new File(mediaDir(), name);
  await new File(uri).copy(target);
  return target.uri;
}

export function deleteFiles(uris: (string | null | undefined)[]): void {
  if (Platform.OS === 'web') return;
  for (const uri of uris) {
    if (!uri) continue;
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // A missing file is fine; nothing to clean up.
    }
  }
}

export function extensionOf(nameOrUri: string, fallback: string): string {
  const match = /\.([a-z0-9]{1,5})(?:\?|$)/i.exec(nameOrUri);
  return match ? match[1].toLowerCase() : fallback;
}
