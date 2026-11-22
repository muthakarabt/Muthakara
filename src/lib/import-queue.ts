/**
 * Photos picked on the subject screen wait here while the import screen reads
 * their text. Kept in memory: picked image links are only valid for this session.
 */
let pending: { subjectId: number; uris: string[] } | null = null;

export function setPendingImages(subjectId: number, uris: string[]): void {
  pending = { subjectId, uris };
}

export function getPendingImages(subjectId: number): string[] {
  return pending && pending.subjectId === subjectId ? pending.uris : [];
}

export function clearPendingImages(): void {
  pending = null;
}
