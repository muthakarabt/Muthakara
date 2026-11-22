/** Web: shrinks a photo (at most 1600px wide) and returns it as base64 JPEG. */
import type { ImageData } from '@/lib/claude';

export async function toImageData(uri: string): Promise<ImageData> {
  const img = new Image();
  img.src = uri;
  await img.decode();
  const scale = Math.min(1, 1600 / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.9);
  return { mediaType: 'image/jpeg', base64: url.slice(url.indexOf(',') + 1) };
}
