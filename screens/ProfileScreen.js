// screens/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput, ActivityIndicator,
  SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { COLORS } from '../constants/colors';
import { getUserDocument } from '../services/userService';
import { getUserEvents } from '../services/eventService';
import { getAllItemHistory } from '../services/historyService';

// ─── Static menu structure ────────────────────────────────────────────────────

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        id: 'edit_name',
        icon: 'person-outline',
        label: 'Edit Display Name',
        arrow: true,
      },
      {
        id: 'smart_suggestions',
        icon: 'bulb-outline',
        label: 'Smart Suggestions',
        arrow: true,
      },
    ],
  },
  {
    title: 'App',
    items: [
      {
        id: 'about',
        icon: 'information-circle-outline',
        label: 'About PrepMate',
        arrow: true,
      },
      {
        id: 'help',
        icon: 'help-circle-outline',
        label: 'Help & Support',
        arrow: true,
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Build initials from displayName or fall back to first letter of email
const getInitials = (displayName, email) => {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

// Pick a consistent avatar background from the initials
const AVATAR_COLORS = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#E65100', '#00695C'];
const getAvatarColor = (initials) => {
  const code = initials.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;

  // ── State ──
  const [displayName,   setDisplayName]   = useState(user?.displayName || '');
  const [stats,         setStats]         = useState({ events: 0, items: 0 });
  const [statsLoading,  setStatsLoading]  = useState(true);

  // Edit name modal
  const [editModal,     setEditModal]     = useState(false);
  const [newName,       setNewName]       = useState('');
  const [nameError,     setNameError]     = useState('');
  const [savingName,    setSavingName]    = useState(false);

  // About modal
  const [aboutModal,    setAboutModal]    = useState(false);

  // Help modal
  const [helpModal,     setHelpModal]     = useState(false);

  // Logout state
  const [loggingOut,    setLoggingOut]    = useState(false);

  // ── Load stats on focus ───────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadStats();
      // Sync displayName in case it was updated elsewhere
      setDisplayName(auth.currentUser?.displayName || '');
    }, [])
  );

  const loadStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const [events, history] = await Promise.all([
        getUserEvents(user.uid),
        getAllItemHistory(user.uid),
      ]);
      setStats({ events: events.length, items: history.length });
    } catch (err) {
      console.error('Profile stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut(auth);
              // Reset navigation stack entirely so back button can't return
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Could not log out. Please try again.');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // ── Edit display name ─────────────────────────────────────────────────────

  const openEditModal = () => {
    setNewName(displayName);
    setNameError('');
    setEditModal(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty.');
      return;
    }
    if (trimmed === displayName) {
      setEditModal(false);
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setDisplayName(trimmed);
      setEditModal(false);
    } catch (err) {
      console.error('Update name error:', err);
      setNameError('Could not update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  // ── Menu item press ───────────────────────────────────────────────────────

  const handleMenuPress = (id) => {
    switch (id) {
      case 'edit_name':
        openEditModal();
        break;
      case 'smart_suggestions':
        navigation.navigate('SmartSuggestions');
        break;
      case 'about':
        setAboutModal(true);
        break;
      case 'help':
        setHelpModal(true);
        break;
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const initials   = getInitials(displayName, user?.email);
  const avatarColor = getAvatarColor(initials);
  const email       = user?.email || '';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Edit name modal ── */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>
            <TextInput
              style={[styles.modalInput, nameError && styles.modalInputError]}
              value={newName}
              onChangeText={(t) => { setNewName(t); setNameError(''); }}
              placeholder="Your name"
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            {nameError ? (
              <Text style={styles.modalError}>{nameError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnOutline}
                onPress={() => setEditModal(false)}
                disabled={savingName}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.modalBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── About modal ── */}
      <Modal visible={aboutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 48 }}>🎒</Text>
            <Text style={styles.modalTitle}>PrepMate</Text>
            <Text style={styles.modalVersion}>Version 1.0.0</Text>
            <Text style={styles.modalBodyText}>
              PrepMate is a smart checklist app that helps you stay organized
              for every event.
            </Text>
            <Text style={styles.modalBodyText}>
              Built with React Native (Expo) and Firebase.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { width: '100%' }]}
              onPress={() => setAboutModal(false)}
            >
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Help modal ── */}
      <Modal visible={helpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 44 }}>🤝</Text>
            <Text style={styles.modalTitle}>Help & Support</Text>
            {[
              ['How do I create an event?',
                'Tap the + button on the My Events tab or the Home screen.'],
              ['How do smart suggestions work?',
                'PrepMate tracks items you add and suggests them based on past usage.'],
              ['Can I reuse a checklist?',
                'Yes — open any event, tap Edit, then use the refresh button to uncheck all items.'],
              ['How do I delete an event?',
                'Swipe left on any event in My Events, or tap the ⋯ menu.'],
            ].map(([q, a]) => (
              <View key={q} style={styles.helpItem}>
                <Text style={styles.helpQuestion}>{q}</Text>
                <Text style={styles.helpAnswer}>{a}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.modalBtn, { width: '100%' }]}
              onPress={() => setHelpModal(false)}
            >
              <Text style={styles.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Avatar card ── */}
        <View style={styles.avatarCard}>
          {/* Avatar circle with initials */}
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          {/* Name + email */}
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName || 'Unnamed User'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>

          {/* Edit name shortcut */}
          <TouchableOpacity style={styles.editNameBtn} onPress={openEditModal}>
            <Ionicons name="pencil" size={14} color={COLORS.primary} />
            <Text style={styles.editNameText}>Edit name</Text>
          </TouchableOpacity>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              {statsLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.statNumber}>{stats.events}</Text>
              }
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {statsLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.statNumber}>{stats.items}</Text>
              }
              <Text style={styles.statLabel}>Items Tracked</Text>
            </View>
          </View>
        </View>

        {/* ── Menu sections ── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuRow,
                    idx < section.items.length - 1 && styles.menuRowBorder,
                  ]}
                  onPress={() => handleMenuPress(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuRowLeft}>
                    <View style={styles.menuIconWrap}>
                      <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </View>
                  {item.arrow && (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout button ── */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.85}
          >
            {loggingOut ? (
              <ActivityIndicator color={COLORS.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                <Text style={styles.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // ── Avatar card ──
  avatarCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  editNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  editNameText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },

  // ── Menu sections ──
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },

  // ── Logout ──
  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },

  // ── Modals (shared base) ──
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
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalVersion: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: -6,
  },
  modalBodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Edit name modal
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  modalInputError: {
    borderColor: COLORS.error,
  },
  modalError: {
    fontSize: 12,
    color: COLORS.error,
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBtnOutline: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnOutlineText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 15,
  },

  // Help modal
  helpItem: {
    width: '100%',
    gap: 3,
  },
  helpQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  helpAnswer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
});