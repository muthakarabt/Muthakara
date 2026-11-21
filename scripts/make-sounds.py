"""Synthesizes the app's short sound effects (no music, no third-party samples).

Run: python3 scripts/make-sounds.py  -> writes assets/sounds/*.wav
"""
import os
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')


def tone(freq, dur, vol=0.5, attack=0.005, decay=6.0):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    env = np.minimum(1, t / attack) * np.exp(-decay * t)
    # A soft bell: fundamental plus a quiet octave.
    wave_ = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return vol * env * wave_ / 1.3


def seq(notes, gap=0.0):
    parts = []
    for f, d in notes:
        parts.append(tone(f, d))
        if gap:
            parts.append(np.zeros(int(SR * gap)))
    return np.concatenate(parts)


def mix(*layers):
    n = max(len(x) for x in layers)
    out = np.zeros(n)
    for x in layers:
        out[: len(x)] += x
    return out


def save(name, samples):
    samples = samples / max(1e-9, np.max(np.abs(samples))) * 0.8
    data = (samples * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


C5, E5, G5, C6, E6, G6 = 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0

os.makedirs(OUT, exist_ok=True)
save('tap.wav', tone(880, 0.08, decay=40))
save('correct.wav', seq([(E5, 0.09), (C6, 0.35)]))
save('wrong.wav', seq([(392.0, 0.12), (311.1, 0.3)]))
save('flip.wav', tone(660, 0.12, decay=25) + tone(990, 0.12, decay=25) * 0.5)
save('levelup.wav', seq([(C5, 0.1), (E5, 0.1), (G5, 0.1), (C6, 0.1), (E6, 0.1), (G6, 0.5)]))
save(
    'complete.wav',
    np.concatenate([seq([(G5, 0.12), (C6, 0.12)]), mix(tone(C6, 0.7), tone(E6, 0.7), tone(G6, 0.7))]),
)
print('ok')
