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
  surface: '#221b12',
  surfaceAlt: '#2d2418',
  text: '#f0e6d2',
  textMuted: '#b89968',
  textFaint: '#8a6f48',
  border: '#3d3022',
  borderStrong: '#5c4a32',
  brand: '#e89941',
  brandSoft: '#3d2818',
  brandText: '#fbbf24',
  heroBg: '#221b12',
  heroText: '#f0e6d2',
};

// Display font: DM Serif Display loaded via expo-font (see app/_layout.tsx).
// Falls back to system serif if the font hasn't loaded yet.
const DISPLAY_FONT = Platform.select({
  ios: 'DMSerifDisplay-Regular, Georgia',
  android: 'DMSerifDisplay-Regular',
  default: 'serif',
}) as string;

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

// Tone colours — semantic (good/bad/caution)
export const TONE = {
  good:    '#15803d',
  bad:     '#dc2626',
  caution: '#d97706',
} as const;
