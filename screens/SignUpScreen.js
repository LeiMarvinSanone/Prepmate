// screens/SignUpScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Modal, Image
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useModalFocus, clearAccessibilityFocus } from '../hooks/useModalFocus';

export default function SignUpScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);

  const [fullName,         setFullName]         = useState('');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [errors,           setErrors]           = useState({});
  const [modal,            setModal]            = useState({ visible: false, title: '', message: '', icon: '' });

  // Safely closes modal and clears accessibility focus (prevents aria-hidden warnings on web)
  const closeModal = useModalFocus(modal, setModal);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    let valid = true;
    let newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      valid = false;
    }
    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email';
      valid = false;
    }
    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // ── Sign Up handler ───────────────────────────────────────────────────────

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      // No navigation.replace needed — onAuthStateChanged in App.js handles it automatically
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setModal({
          visible: true,
          icon: '📧',
          title: 'Account Already Exists',
          message: 'An account with this email already exists. Please log in instead.',
        });
      } else if (error.code === 'auth/weak-password') {
        setModal({
          visible: true,
          icon: '⚠️',
          title: 'Weak Password',
          message: 'Your password is too weak. Please use at least 6 characters.',
        });
      } else {
        setModal({
          visible: true,
          icon: '❌',
          title: 'Sign Up Failed',
          message: 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Error / info modal */}
      <Modal visible={modal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>{modal.icon}</Text>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
            {modal.title === 'Account Already Exists' && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  clearAccessibilityFocus();
                  setModal({ ...modal, visible: false });
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Go to Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/prepmateicon1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setErrors({ ...errors, fullName: null }); }}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          {errors.fullName && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.error} />
              <Text style={styles.errorText}>{errors.fullName}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="email" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: null }); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          {errors.email && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.error} />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          )}

          {/* Password */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: null }); }}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.error} />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: null }); }}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.error} />
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            </View>
          )}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  form: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -6,
    marginLeft: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
  },
  signUpButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  signUpButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  logo: {
    width: 260,
    height: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  modalIcon: {
    fontSize: 48,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modalButtonOutlineText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});