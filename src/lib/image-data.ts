/** Phone: shrinks a photo to a size that keeps text sharp and returns it as base64 JPEG. */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ImageData } from '@/lib/claude';

export async function toImageData(uri: string): Promise<ImageData> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
  const saved = await ref.saveAsync({ base64: true, compress: 0.9, format: SaveFormat.JPEG });
  return { mediaType: 'image/jpeg', base64: saved.base64 ?? '' };
}
