// context/ThemeContext.js
// Dark mode preference is persisted to localStorage (web) so it survives refresh.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

export const lightColors = {
  primary:       '#2E7D32',
  primaryLight:  '#E8F5E9',
  background:    '#F9F9F9',
  white:         '#FFFFFF',
  text:          '#1A1A1A',
  textSecondary: '#757575',
  border:        '#E0E0E0',
  error:         '#D32F2F',
  success:       '#388E3C',
};

export const darkColors = {
  primary:       '#66BB6A',
  primaryLight:  '#1B3A1C',
  background:    '#121212',
  white:         '#1E1E1E',
  text:          '#F0F0F0',
  textSecondary: '#9E9E9E',
  border:        '#2C2C2C',
  error:         '#EF9A9A',
  success:       '#66BB6A',
};

const STORAGE_KEY = 'prepmate_dark_mode';

// Read persisted preference synchronously before first render
const getInitialDark = () => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
  } catch {}
  return false;
};

const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialDark);

  // Persist every change
  useEffect(() => {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(isDark));
      }
    } catch {}
  }, [isDark]);

  const colors = isDark ? darkColors : lightColors;
  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);