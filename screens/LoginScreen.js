// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Image, Modal
} from 'react-native';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, GOOGLE_WEB_CLIENT_ID } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useModalFocus, clearAccessibilityFocus } from '../hooks/useModalFocus';


WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { colors: COLORS, theme } = useTheme();
  const styles = makeStyles(COLORS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState({ visible: false, title: '', message: '', icon: '' });
  
  // Hook to safely close modal while clearing focus to prevent aria-hidden warnings
  const closeModal = useModalFocus(modal, setModal);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

   React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setGoogleLoading(true);
      signInWithCredential(auth, credential)
        // Remove navigation.replace('Main') — onAuthStateChanged in App.js handles this
        .catch(() => setModal({
          visible: true,
          icon: '❌',
          title: 'Google Sign-In Failed',
          message: 'Something went wrong. Please try again.',
        }))
        .finally(() => setGoogleLoading(false));
    }
  }, [response]);

  const validate = () => {
    let valid = true;
    let newErrors = {};
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
    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Remove navigation.replace('Main') — onAuthStateChanged in App.js handles this automatically
    } catch (error) {
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password'
      ) {
        setModal({
          visible: true,
          icon: '🔍',
          title: 'Account Not Found',
          message: "We couldn't find an account with this email. Please sign up first or check your credentials.",
        });
      } else if (error.code === 'auth/too-many-requests') {
        setModal({
          visible: true,
          icon: '⚠️',
          title: 'Too Many Attempts',
          message: 'Too many failed login attempts. Please try again later.',
        });
      } else {
        setModal({
          visible: true,
          icon: '❌',
          title: 'Login Failed',
          message: 'Invalid email or password. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Error Modal */}
      <Modal visible={modal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>{modal.icon}</Text>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={closeModal}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
            {modal.title === 'Account Not Found' && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  clearAccessibilityFocus();
                  setModal({ ...modal, visible: false });
                  navigation.navigate('SignUp');
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Create Account</Text>
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
          <Text style={styles.title}>Welcome Back! 👋</Text>
          <Text style={styles.subtitle}>Log in to continue to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

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

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    gap: 12,
  },
  logo: {
    width: 260,
    height: 260,
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
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  inputWrapperFocused: {
    borderWidth: 0,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    outlineWidth: 0,
    borderWidth: 0,
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
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 10,
    backgroundColor: COLORS.white,
  },
  googleIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  signUpText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  signUpLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
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