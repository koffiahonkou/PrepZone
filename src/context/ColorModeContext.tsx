import React, { createContext, useContext, useEffect, useState } from 'react';

export type ColorMode = 'day' | 'night';

interface ColorModeContextType {
  mode: ColorMode;
  isNight: boolean;
  toggleMode: () => void;
  setMode: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined);

const STORAGE_KEY = 'eduform_color_mode';

export function getInitialColorMode(): ColorMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'day' || saved === 'night') {
      return saved;
    }
    // Check system preference fallback
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'night';
    }
  } catch {
    // fallback
  }
  return 'day';
}

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ColorMode>(() => getInitialColorMode());

  const applyMode = (newMode: ColorMode) => {
    if (newMode === 'night') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-mode', 'night');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-mode', 'day');
    }
  };

  useEffect(() => {
    applyMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('eduform_mode_changed', { detail: { mode } }));
  }, [mode]);

  const toggleMode = () => {
    setModeState((prev) => (prev === 'day' ? 'night' : 'day'));
  };

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
  };

  return (
    <ColorModeContext.Provider
      value={{
        mode,
        isNight: mode === 'night',
        toggleMode,
        setMode,
      }}
    >
      {children}
    </ColorModeContext.Provider>
  );
};

export function useColorMode(): ColorModeContextType {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
}
