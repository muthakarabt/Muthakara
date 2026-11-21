export const Colors = {
  light: {
    text: '#1B1B1F',
    textSecondary: '#5F6470',
    background: '#F7F7FA',
    card: '#FFFFFF',
    border: '#E3E4EA',
    primary: '#1F7A6B',
    primaryText: '#FFFFFF',
    primarySoft: '#DDF1EC',
    warning: '#B26B00',
    warningSoft: '#FCEFD9',
    danger: '#C0392B',
    dangerSoft: '#FBE3E0',
  },
  dark: {
    text: '#F2F2F5',
    textSecondary: '#A9ADB8',
    background: '#0E0F12',
    card: '#1A1C21',
    border: '#2B2E35',
    primary: '#3FB8A2',
    primaryText: '#08201B',
    primarySoft: '#173A34',
    warning: '#F0A43A',
    warningSoft: '#3A2A12',
    danger: '#EF6B5B',
    dangerSoft: '#3D1C18',
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

export const Radius = { small: 8, medium: 14, large: 20 } as const;

export const MaxContentWidth = 700;
