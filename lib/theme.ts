// Far direction theme tokens — newspaper-meets-roadside-cafe.
// Status colours (red/green/amber/blue/stone) are LOCKED — see constants/index.ts.
// Brand chrome (surfaces, accents, type) is what's defined here.

import { Platform } from 'react-native';

export type FarPalette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  brand: string;
  brandSoft: string;
  brandText: string;
  heroBg: string;
  heroText: string;
};

export type FarTokens = {
  palette: FarPalette;
  type: {
    display: string;
    text: string;
    mono: string;
    displayWeight: '400' | '500' | '600' | '700';
  };
  radius: { card: number; pill: number; chip: number };
};

const FAR_LIGHT: FarPalette = {
  bg: '#ebe4d3',
  surface: '#f7f1e0',
  surfaceAlt: '#e0d8c2',
  text: '#1a0f08',
  textMuted: '#6b4a2e',
  textFaint: '#9c7a55',
  border: '#d4c8a8',
  borderStrong: '#b8a577',
  brand: '#b45309',
  brandSoft: '#e8c896',
  brandText: '#5c2d0a',
  heroBg: '#1a0f08',
  heroText: '#ebe4d3',
};

const FAR_DARK: FarPalette = {
  bg: '#1a140d',
  surface: '#2a2218',
  surfaceAlt: '#332919',
  text: '#fbf3dc',
  textMuted: '#c9a874',
  textFaint: '#9c815a',
  border: '#3d3022',
  borderStrong: '#5c4a32',
  brand: '#f0a850',
  brandSoft: '#3d2818',
  brandText: '#fbbf24',
  heroBg: '#2a2218',
  heroText: '#fbf3dc',
};

// Display font: DM Serif Display loaded via expo-font (see app/_layout.tsx).
// React Native does NOT support comma-separated font fallbacks — the
// literal string is treated as the font NAME, so any fallback after a
// comma silently breaks the font lookup. Use a single registered family.
const DISPLAY_FONT = 'DMSerifDisplay-Regular';

const TEXT_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
}) as string;

const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

const TYPE = {
  display: DISPLAY_FONT,
  text: TEXT_FONT,
  mono: MONO_FONT,
  displayWeight: '400' as const,
};

const RADIUS = { card: 4, pill: 999, chip: 0 };

export function getFarTokens(dark: boolean): FarTokens {
  return {
    palette: dark ? FAR_DARK : FAR_LIGHT,
    type: TYPE,
    radius: RADIUS,
  };
}

// Status colours — LOCKED, available at all times for state UI
export const STATUS_DOT: Record<string, string> = {
  pending:    '#f59e0b',
  accepted:   '#22c55e',
  rejected:   '#ef4444',
  waitlisted: '#3b82f6',
  withdrawn:  '#a8a29e',
};

// Tone colours — semantic (good/bad/caution). Light-mode defaults.
export const TONE = {
  good:    '#15803d',
  bad:     '#dc2626',
  caution: '#d97706',
} as const;

// Dark-mode-aware status palette. The locked status palette (15803d / dc2626 / d97706 / 1d4ed8)
// is too dark to read on espresso bg. In dark mode, use the brighter 400-tones; semantic meaning
// stays identical (red=loss, green=accepted, etc.).
export type FarStatusPalette = {
  red: string; green: string; amber: string; blue: string; stone: string;
  redBg: string; greenBg: string; amberBg: string; blueBg: string;
};

export function farStatus(dark: boolean): FarStatusPalette {
  if (dark) {
    return {
      red:   '#f87171', // red-400
      green: '#4ade80', // green-400
      amber: '#fbbf24', // amber-400
      blue:  '#60a5fa', // blue-400
      stone: '#a8a29e',
      redBg:   'rgba(248,113,113,0.10)',
      greenBg: 'rgba(74,222,128,0.10)',
      amberBg: 'rgba(251,191,36,0.10)',
      blueBg:  'rgba(96,165,250,0.10)',
    };
  }
  return {
    red:   '#dc2626',
    green: '#15803d',
    amber: '#d97706',
    blue:  '#1d4ed8',
    stone: '#78716c',
    redBg:   'rgba(220,38,38,0.06)',
    greenBg: 'rgba(21,128,61,0.06)',
    amberBg: 'rgba(217,119,6,0.06)',
    blueBg:  'rgba(29,78,216,0.06)',
  };
}
