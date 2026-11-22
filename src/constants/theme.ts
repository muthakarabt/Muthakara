/**
 * Calm, nature-inspired palette: mint and sky in the background gradient,
 * a deep teal for actions and a warm sun colour for highlights.
 */
export const Colors = {
  light: {
    text: '#13302B',
    textSecondary: '#536a65',
    bgTop: '#CFEFE4',
    bgMid: '#E4EEFB',
    bgBottom: '#FCEBD8',
    background: '#E4F2EE',
    card: 'rgba(255,255,255,0.78)',
    cardSolid: '#FFFFFF',
    border: 'rgba(19,48,43,0.09)',
    primary: '#15806C',
    primaryText: '#FFFFFF',
    primarySoft: 'rgba(21,128,108,0.13)',
    accent: '#E98A2E',
    accentSoft: 'rgba(233,138,46,0.15)',
    sky: '#2F6FA8',
    skySoft: 'rgba(47,111,168,0.13)',
    warning: '#A9640A',
    warningSoft: 'rgba(233,160,46,0.18)',
    danger: '#BF4034',
    dangerSoft: 'rgba(191,64,52,0.12)',
    heroFrom: '#138A73',
    heroTo: '#2F6FA8',
    blobA: 'rgba(21,128,108,0.16)',
    blobB: 'rgba(233,138,46,0.16)',
  },
  dark: {
    text: '#EAF4F1',
    textSecondary: '#9EB5AF',
    bgTop: '#0D2A25',
    bgMid: '#111C31',
    bgBottom: '#22192A',
    background: '#0F2226',
    card: 'rgba(255,255,255,0.07)',
    cardSolid: '#18282C',
    border: 'rgba(255,255,255,0.09)',
    primary: '#4CC7AD',
    primaryText: '#04201A',
    primarySoft: 'rgba(76,199,173,0.16)',
    accent: '#F4B169',
    accentSoft: 'rgba(244,177,105,0.16)',
    sky: '#80B4E8',
    skySoft: 'rgba(128,180,232,0.15)',
    warning: '#F0A43A',
    warningSoft: 'rgba(240,164,58,0.16)',
    danger: '#F07A6B',
    dangerSoft: 'rgba(240,122,107,0.16)',
    heroFrom: '#11664F',
    heroTo: '#24487A',
    blobA: 'rgba(76,199,173,0.12)',
    blobB: 'rgba(244,177,105,0.10)',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = { small: 10, medium: 16, large: 24 } as const;

export const MaxContentWidth = 700;

/** IBM Plex Sans Arabic covers both Arabic and Latin. Each weight is a separate family on native. */
export const Font = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;
