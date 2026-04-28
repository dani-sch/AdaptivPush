// ─── Theme token interface ────────────────────────────────────────────────────

export interface Theme {
  // Backgrounds
  background: string;
  backgroundDark: string;
  surfaceBg: string;
  cardBg: string;
  mutedBg: string;

  // Borders
  border: string;

  // Text
  textPrimary: string;   // headings / prominent text — white in dark, near-black in light
  text: string;          // body / secondary text
  placeholder: string;

  // Always white (text on coloured buttons/accents)
  white: string;

  // Brand colours
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;

  // Interactive
  buttonPicked: string;
  buttonDisabled: string;

  // Semantic
  error: string;
  errorLight: string;
  success: string;
}

// ─── Dark theme ───────────────────────────────────────────────────────────────

export const DARK_THEME: Theme = {
  background:     '#18181b',
  backgroundDark: '#09090b',
  surfaceBg:      '#0f0f12',
  cardBg:         '#111113',
  mutedBg:        '#222226',

  border: '#27272a',

  textPrimary: '#ffffff',
  text:        '#a1a1aa',
  placeholder: '#71717a',

  white: '#ffffff',

  primary:         '#2563EB',
  primaryLight:    '#60a5fa',
  secondary:       '#9333EA',
  secondaryLight:  '#a855f7',

  buttonPicked:   '#5b7cff',
  buttonDisabled: '#3F3F46',

  error:      '#dc2626',
  errorLight: '#ef4444',
  success:    '#16a34a',
};

// ─── Light theme ──────────────────────────────────────────────────────────────

export const LIGHT_THEME: Theme = {
  background:     '#f8f8fa',
  backgroundDark: '#ededf0',
  surfaceBg:      '#ffffff',
  cardBg:         '#ffffff',
  mutedBg:        '#f2f2f6',

  border: '#e4e4e8',

  textPrimary: '#1a1a1e',
  text:        '#6e6e73',
  placeholder: '#8e8e93',

  white: '#ffffff',

  primary:        '#2563EB',
  primaryLight:   '#60a5fa',
  secondary:      '#9333EA',
  secondaryLight: '#a855f7',

  buttonPicked:   '#5b7cff',
  buttonDisabled: '#c7c7cc',

  error:      '#dc2626',
  errorLight: '#ef4444',
  success:    '#16a34a',
};
