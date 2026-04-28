import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME, type Theme } from '@/constants/themes';
import { PALETTES, DEFAULT_PALETTE, type PaletteKey } from '@/constants/palettes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppearancePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  preference: AppearancePreference;
  setPreference: (p: AppearancePreference) => void;
  palette: PaletteKey;
  setPalette: (p: PaletteKey) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const APPEARANCE_KEY = 'appearance_preference';
const PALETTE_KEY    = 'palette_key';

const ThemeContext = createContext<ThemeContextValue>({
  theme: DARK_THEME,
  isDark: true,
  preference: 'system',
  setPreference: () => {},
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [palette, setPaletteState] = useState<PaletteKey>(DEFAULT_PALETTE);

  // Load persisted preferences on mount
  useEffect(() => {
    AsyncStorage.multiGet([APPEARANCE_KEY, PALETTE_KEY]).then(pairs => {
      const [appearancePair, palettePair] = pairs;
      const stored = appearancePair[1];
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
      const storedPalette = palettePair[1];
      if (storedPalette && storedPalette in PALETTES) {
        setPaletteState(storedPalette as PaletteKey);
      }
    });
  }, []);

  const setPreference = useCallback((p: AppearancePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(APPEARANCE_KEY, p);
  }, []);

  const setPalette = useCallback((p: PaletteKey) => {
    setPaletteState(p);
    AsyncStorage.setItem(PALETTE_KEY, p);
  }, []);

  const isDark = useMemo(() => {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemScheme === 'dark';
  }, [preference, systemScheme]);

  // Merge base light/dark theme with active palette accent tokens
  const theme = useMemo<Theme>(() => {
    const base = isDark ? DARK_THEME : LIGHT_THEME;
    const p    = PALETTES[palette];
    return {
      ...base,
      primary:        p.primary,
      primaryLight:   p.primaryLight,
      secondary:      p.secondary,
      secondaryLight: p.secondaryLight,
      buttonPicked:   p.buttonPicked,
    };
  }, [isDark, palette]);

  const value = useMemo(
    () => ({ theme, isDark, preference, setPreference, palette, setPalette }),
    [theme, isDark, preference, setPreference, palette, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}
