// screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { createUserDocument } from '../services/userService';

export default function SplashScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  
  useEffect(() => {
    // ── Listen for auth state changes ──────────────────────────────────────
    // This ensures the user document exists in Firestore when they log in.
    // App.js (AppNavigator) is the MAIN auth listener that drives navigation.
    // This listener is just here to initialize user data in database.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is logged in — create their document in Firestore if it doesn't exist
          // This ensures their profile data is initialized
          await createUserDocument(user.uid, { email: user.email });
          // App.js will automatically switch to authenticated navigator (MainTabs)
        }
        // No user? App.js will automatically switch to auth stack (Splash → Login → SignUp)
      } catch (error) {
        console.error('SplashScreen error:', error);
        // Continue anyway - let App.js handle navigation
      }
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🎒</Text>
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
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
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