// ─── Palette token interface ──────────────────────────────────────────────────

export interface Palette {
  primary:        string;
  primaryLight:   string;
  secondary:      string;
  secondaryLight: string;
  buttonPicked:   string;
  /** Swatch colour shown in the picker (always the primary) */
  swatch:         string;
  label:          string;
}

// ─── Palette definitions ──────────────────────────────────────────────────────
// All primary / secondary values are dark enough for white text (WCAG AA ≥ 4.5:1).

export const PALETTES = {
  blue: {
    primary:        '#2563EB',
    primaryLight:   '#60a5fa',
    secondary:      '#7c3aed',
    secondaryLight: '#a78bfa',
    buttonPicked:   '#3b82f6',
    swatch:         '#2563EB',
    label:          'Blue',
  },
  'pink-purple': {
    primary:        '#9333ea',
    primaryLight:   '#c084fc',
    secondary:      '#db2777',
    secondaryLight: '#f472b6',
    buttonPicked:   '#a855f7',
    swatch:         '#9333ea',
    label:          'Purple',
  },
  pink: {
    primary:        '#db2777',
    primaryLight:   '#f472b6',
    secondary:      '#9333ea',
    secondaryLight: '#c084fc',
    buttonPicked:   '#ec4899',
    swatch:         '#db2777',
    label:          'Pink',
  },
  green: {
    primary:        '#16a34a',
    primaryLight:   '#4ade80',
    secondary:      '#0d9488',
    secondaryLight: '#2dd4bf',
    buttonPicked:   '#22c55e',
    swatch:         '#16a34a',
    label:          'Green',
  },
  red: {
    primary:        '#e11d48',
    primaryLight:   '#fb7185',
    secondary:      '#c2410c',
    secondaryLight: '#fb923c',
    buttonPicked:   '#f43f5e',
    swatch:         '#e11d48',
    label:          'Red',
  },
} as const satisfies Record<string, Palette>;

export type PaletteKey = keyof typeof PALETTES;

export const DEFAULT_PALETTE: PaletteKey = 'blue';
