"""Synthesizes the app's short nature-like sound effects (no music, no third-party samples).

water drops for right answers, a hollow wood knock for wrong ones, a leaf rustle
for flips and bird chirps for finishing a session or levelling up.

Run: python3 scripts/make-sounds.py  -> writes assets/sounds/*.wav
"""
import os
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.linspace(0, dur, int(SR * dur), endpoint=False)


def drop(f0=900, f1=1900, dur=0.22, decay=22.0):
    """A water drop: a sine whose pitch glides up quickly, with a fast decay."""
    t = t_axis(dur)
    freq = f0 + (f1 - f0) * (1 - np.exp(-t * 45))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.minimum(1, t / 0.002) * np.exp(-decay * t)
    return np.sin(phase) * env


def knock(freq=180, dur=0.16):
    """A soft hollow wood knock: low partials and a tiny click of noise."""
    t = t_axis(dur)
    env = np.minimum(1, t / 0.001) * np.exp(-38 * t)
    body = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * t) + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t)
    click = rng.normal(0, 1, len(t)) * np.exp(-400 * t) * 0.3
    return (body + click) * env


def lowpass(x, alpha):
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def rustle(dur=0.32):
    """Leaves: band-limited noise with a few soft swells."""
    t = t_axis(dur)
    noise = rng.normal(0, 1, len(t))
    band = lowpass(noise, 0.35) - lowpass(noise, 0.04)
    swell = np.sin(np.pi * t / dur) ** 1.5 * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t) ** 2)
    return band * swell


def chirp(f_start, f_end, dur=0.09, vib=0.0):
    """One bird chirp: a fast pitch sweep with a little warble."""
    t = t_axis(dur)
    freq = f_start + (f_end - f_start) * (t / dur) ** 0.7 + vib * np.sin(2 * np.pi * 38 * t)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.sin(np.pi * t / dur) ** 2
    return np.sin(phase) * env


def silence(dur):
    return np.zeros(int(SR * dur))


def seq(*parts):
    return np.concatenate(parts)


def mix(*layers):
    n = max(len(x) for x in layers)
    out = np.zeros(n)
    for x in layers:
        out[: len(x)] += x
    return out


def save(name, samples, peak=0.8):
    samples = samples / max(1e-9, np.max(np.abs(samples))) * peak
    # short fade-out so nothing clicks at the end
    fade = min(len(samples), int(SR * 0.01))
    samples[-fade:] *= np.linspace(1, 0, fade)
    data = (samples * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


os.makedirs(OUT, exist_ok=True)

# tiny wooden tick for buttons
save('tap', knock(420, 0.05), peak=0.5)
# right answer: two water drops
save('correct', seq(drop(850, 1700, 0.16), silence(0.04), drop(1100, 2300, 0.2)))
# nearly right: one softer, lower drop
save('close', drop(600, 1150, 0.24, decay=16), peak=0.6)
# wrong: two soft hollow knocks
save('wrong', seq(knock(190), silence(0.05), knock(150, 0.2)), peak=0.65)
# flip / reveal: leaves
save('flip', rustle(), peak=0.45)
# finished a session: a short bird phrase
save('complete', seq(
    chirp(2600, 3600, 0.08), silence(0.05),
    chirp(2800, 3900, 0.08), silence(0.12),
    chirp(3400, 2400, 0.14, vib=120), silence(0.06),
    mix(chirp(2500, 3800, 0.18, vib=80), drop(1000, 2000, 0.25) * 0.3),
))
# level up / achievement: rising chirps over a water drop
save('levelup', seq(
    mix(drop(700, 1400, 0.25) * 0.5, chirp(2200, 3000, 0.09)), silence(0.04),
    chirp(2600, 3400, 0.09), silence(0.04),
    chirp(3000, 4000, 0.12, vib=150),
))
print('ok')
