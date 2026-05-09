// screens/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput, ActivityIndicator,
  SafeAreaView, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { COLORS } from '../constants/colors';
import { getUserEvents } from '../services/eventService';
import { getAllItemHistory } from '../services/historyService';

// ─── Avatar helpers (also exported for HomeScreen to reuse) ───────────────────

export const getInitials = (displayName, email) => {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

const AVATAR_BG_COLORS = ['#2E7D32','#1565C0','#6A1B9A','#AD1457','#E65100','#00695C'];
export const getAvatarColor = (initials) => {
  const code = (initials || '?').charCodeAt(0);
  return AVATAR_BG_COLORS[code % AVATAR_BG_COLORS.length];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;

  const [displayName,  setDisplayName]  = useState(user?.displayName || '');
  const [stats,        setStats]        = useState({ events: 0, items: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isDark,       setIsDark]       = useState(false);

  // Edit name modal
  const [editModal,  setEditModal]  = useState(false);
  const [newName,    setNewName]    = useState('');
  const [nameError,  setNameError]  = useState('');
  const [savingName, setSavingName] = useState(false);

  // Info modals
  const [aboutModal, setAboutModal] = useState(false);
  const [helpModal,  setHelpModal]  = useState(false);

  // ── Load stats on every focus ─────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      setDisplayName(auth.currentUser?.displayName || '');
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    if (!user) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      // Promise.allSettled — one failure won't zero out the other stat
      const [eventsResult, historyResult] = await Promise.allSettled([
        getUserEvents(user.uid),
        getAllItemHistory(user.uid),
      ]);
      setStats({
        events: eventsResult.status  === 'fulfilled' ? eventsResult.value.length  : 0,
        items:  historyResult.status === 'fulfilled' ? historyResult.value.length : 0,
      });
    } catch (err) {
      console.error('Profile stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  // NOTE: No `disabled` prop on the button — the previous version used a
  // `loggingOut` state that could get stuck and permanently block the button.

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
            try {
              await signOut(auth);
              // reset() wipes the nav stack so back button can't return to the app
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Edit name ─────────────────────────────────────────────────────────────

  const openEditModal = () => {
    setNewName(displayName);
    setNameError('');
    setEditModal(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('Name cannot be empty.'); return; }
    if (trimmed === displayName) { setEditModal(false); return; }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setDisplayName(trimmed);
      setEditModal(false);
    } catch {
      setNameError('Could not update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const initials    = getInitials(displayName, user?.email);
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
            {!!nameError && <Text style={styles.modalError}>{nameError}</Text>}
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
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalBtnText}>Save</Text>}
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
              PrepMate is a smart checklist app that helps you stay organized for every event — from beach trips to job interviews.
            </Text>
            <Text style={styles.modalBodyText}>Built with React Native (Expo) and Firebase.</Text>
            <TouchableOpacity style={[styles.modalBtn, { width: '100%' }]} onPress={() => setAboutModal(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Help modal ── */}
      <Modal visible={helpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <Text style={{ fontSize: 44 }}>🤝</Text>
            <Text style={styles.modalTitle}>Help & Support</Text>
            {[
              ['How do I create an event?', 'Tap the + button on the My Events tab or the Home screen.'],
              ['How do smart suggestions work?', 'PrepMate tracks items you add and suggests them based on past usage.'],
              ['Can I reuse a checklist?', 'Yes — open any event, tap Edit, then use the refresh button to uncheck all items.'],
              ['How do I delete an event?', 'Swipe left on any event in My Events, or tap the ⋯ menu.'],
            ].map(([q, a]) => (
              <View key={q} style={styles.helpItem}>
                <Text style={styles.helpQuestion}>{q}</Text>
                <Text style={styles.helpAnswer}>{a}</Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.modalBtn, { width: '100%' }]} onPress={() => setHelpModal(false)}>
              <Text style={styles.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Avatar card ── */}
        <View style={styles.avatarCard}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName || 'Unnamed User'}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <TouchableOpacity style={styles.editNameBtn} onPress={openEditModal}>
            <Ionicons name="pencil" size={14} color={COLORS.primary} />
            <Text style={styles.editNameText}>Edit name</Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              {statsLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.statNumber}>{stats.events}</Text>}
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {statsLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.statNumber}>{stats.items}</Text>}
              <Text style={styles.statLabel}>Items Tracked</Text>
            </View>
          </View>
        </View>

        {/* ── Account menu ── */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            {[
              { id: 'edit_name',         icon: 'person-outline', label: 'Edit Display Name' },
              { id: 'smart_suggestions', icon: 'bulb-outline',   label: 'Smart Suggestions' },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuRow, idx < arr.length - 1 && styles.menuRowBorder]}
                onPress={() => {
                  if (item.id === 'edit_name')         openEditModal();
                  if (item.id === 'smart_suggestions') navigation.navigate('SmartSuggestions');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuRowLeft}>
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── App menu ── */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>App</Text>
          <View style={styles.menuCard}>

            {/* Dark mode row — Switch instead of chevron */}
            <View style={[styles.menuRow, styles.menuRowBorder]}>
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.menuLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => setIsDark(val)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            {[
              { id: 'about', icon: 'information-circle-outline', label: 'About PrepMate' },
              { id: 'help',  icon: 'help-circle-outline',        label: 'Help & Support' },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuRow, idx < arr.length - 1 && styles.menuRowBorder]}
                onPress={() => {
                  if (item.id === 'about') setAboutModal(true);
                  if (item.id === 'help')  setHelpModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuRowLeft}>
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Logout ── */}
        <View style={styles.logoutSection}>
          {/* No disabled prop — removing loggingOut state was the fix */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: COLORS.background },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  avatarCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 20,
    borderRadius: 20, padding: 24,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarInitials: { fontSize: 34, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  profileName:    { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  profileEmail:   { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  editNameBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  editNameText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16,
  },
  statItem:    { flex: 1, alignItems: 'center', gap: 4 },
  statNumber:  { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel:   { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  menuSection:      { marginTop: 24, paddingHorizontal: 16 },
  menuSectionTitle: {
    fontSize: 12, fontWeight: '600', color: COLORS.textSecondary,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuRowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },

  logoutSection: { paddingHorizontal: 16, marginTop: 24 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.white, borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1, borderColor: '#FFCDD2',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: COLORS.error },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 380,
    alignItems: 'center', gap: 12,
  },
  modalTitle:    { fontSize: 19, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  modalVersion:  { fontSize: 13, color: COLORS.textSecondary, marginTop: -6 },
  modalBodyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalInput: {
    width: '100%', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background,
  },
  modalInputError:     { borderColor: COLORS.error },
  modalError:          { fontSize: 12, color: COLORS.error, alignSelf: 'flex-start', marginTop: -4 },
  modalActions:        { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  modalBtnText:        { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalBtnOutline: {
    flex: 1, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalBtnOutlineText: { color: COLORS.text, fontWeight: '500', fontSize: 15 },
  helpItem:            { width: '100%', gap: 3 },
  helpQuestion:        { fontSize: 14, fontWeight: '600', color: COLORS.text },
  helpAnswer:          { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
});