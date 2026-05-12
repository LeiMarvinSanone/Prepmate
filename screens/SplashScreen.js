// screens/SplashScreen.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ── Pure UI component - Just displays the splash screen ──────────────────
// App.js handles all auth logic and navigation
export default function SplashScreen() {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/prepmateicon1.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>PrepMate</Text>
        <Text style={styles.tagline}>Smart checklists for every event.</Text>
      </View>
      <ActivityIndicator 
        size="large" 
        color={COLORS.primary} 
        style={styles.loader}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  logo: {
    width: 260,
    height: 260,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  loader: {
    marginTop: 20,
  },
});