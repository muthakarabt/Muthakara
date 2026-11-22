import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const SOURCES = {
  tap: require('@/assets/sounds/tap.wav'),
  correct: require('@/assets/sounds/correct.wav'),
  close: require('@/assets/sounds/close.wav'),
  wrong: require('@/assets/sounds/wrong.wav'),
  flip: require('@/assets/sounds/flip.wav'),
  levelup: require('@/assets/sounds/levelup.wav'),
  complete: require('@/assets/sounds/complete.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

/** Plays a short effect. Sound is a nicety, so failures are ignored. */
export function playSound(name: SoundName): void {
  if (!enabled) return;
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = name === 'tap' ? 0.35 : 0.75;
      players[name] = p;
    }
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // ignore
  }
}
