// context/ThemeContext.js
import React, { createContext, useContext, useState } from 'react';

export const lightColors = {
  primary:       '#2E7D32',
  primaryLight:  '#E8F5E9',
  accent:        '#66BB6A',
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
  accent:        '#A5D6A7',
  background:    '#121212',
  white:         '#1E1E1E',
  text:          '#F0F0F0',
  textSecondary: '#9E9E9E',
  border:        '#2C2C2C',
  error:         '#EF9A9A',
  success:       '#66BB6A',
};

const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const colors = isDark ? darkColors : lightColors;
  const toggleTheme = () => setIsDark(prev => !prev);
  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);