// screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { COLORS } from '../constants/colors';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in → go to Main
        navigation.replace('Main');
      } else {
        // No user → go to Login
        navigation.replace('Login');
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

const styles = StyleSheet.create({
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