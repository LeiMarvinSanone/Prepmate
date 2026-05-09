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
import { useTheme } from '../context/ThemeContext';
import { getUserEvents } from '../services/eventService';
import { getAllItemHistory } from '../services/historyService';

// ─── Exported helpers (HomeScreen imports these) ──────────────────────────────

export const getInitials = (displayName, email) => {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
};

const AVATAR_BG = ['#2E7D32','#1565C0','#6A1B9A','#AD1457','#E65100','#00695C'];
export const getAvatarColor = (initials) => {
  const code = (initials || '?').charCodeAt(0);
  return AVATAR_BG[code % AVATAR_BG.length];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const user = auth.currentUser;

  const [displayName,  setDisplayName]  = useState(user?.displayName || '');
  const [stats,        setStats]        = useState({ events: 0, items: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [editModal,    setEditModal]    = useState(false);
  const [newName,      setNewName]      = useState('');
  const [nameError,    setNameError]    = useState('');
  const [savingName,   setSavingName]   = useState(false);
  const [aboutModal,   setAboutModal]   = useState(false);
  const [helpModal,    setHelpModal]    = useState(false);

  useFocusEffect(
    useCallback(() => {
      setDisplayName(auth.currentUser?.displayName || '');
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    if (!user) { setStatsLoading(false); return; }
    setStatsLoading(true);
    try {
      const [evR, hiR] = await Promise.allSettled([
        getUserEvents(user.uid),
        getAllItemHistory(user.uid),
      ]);
      setStats({
        events: evR.status  === 'fulfilled' ? evR.value.length  : 0,
        items:  hiR.status  === 'fulfilled' ? hiR.value.length  : 0,
      });
    } catch (err) {
      console.error('Profile stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ── Logout: navigate to Splash and let its onAuthStateChanged handle redirect ──
  // Navigating directly to 'Login' after signOut conflicts with the Splash listener
  // which also tries to navigate to 'Login' when it sees a null user, causing a
  // navigation conflict that silently blocks the redirect.
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
              // Reset to Splash — Splash's onAuthStateChanged sees null user
              // and calls navigation.replace('Login') automatically.
              navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = () => { setNewName(displayName); setNameError(''); setEditModal(true); };

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

  const initials    = getInitials(displayName, user?.email);
  const avatarColor = getAvatarColor(initials);
  const email       = user?.email || '';

  const c = colors; // shorthand

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>

      {/* Edit name modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.white }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>Edit Display Name</Text>
            <TextInput
              style={[s.modalInput, { borderColor: nameError ? c.error : c.border, backgroundColor: c.background, color: c.text }]}
              value={newName}
              onChangeText={(t) => { setNewName(t); setNameError(''); }}
              placeholder="Your name"
              placeholderTextColor={c.textSecondary}
              autoFocus maxLength={50} returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            {!!nameError && <Text style={[s.modalError, { color: c.error }]}>{nameError}</Text>}
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtnOut, { borderColor: c.border }]} onPress={() => setEditModal(false)} disabled={savingName}>
                <Text style={[s.modalBtnOutText, { color: c.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: c.primary }]} onPress={handleSaveName} disabled={savingName}>
                {savingName ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About modal */}
      <Modal visible={aboutModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.white }]}>
            <Text style={{ fontSize: 48 }}>🎒</Text>
            <Text style={[s.modalTitle, { color: c.text }]}>PrepMate</Text>
            <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: -6 }}>Version 1.0.0</Text>
            <Text style={{ fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Smart checklist app for every event — from beach trips to job interviews.
            </Text>
            <Text style={{ fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Built with React Native (Expo) and Firebase.
            </Text>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: c.primary, width: '100%' }]} onPress={() => setAboutModal(false)}>
              <Text style={s.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help modal */}
      <Modal visible={helpModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: c.white, maxHeight: '80%' }]}>
            <Text style={{ fontSize: 44 }}>🤝</Text>
            <Text style={[s.modalTitle, { color: c.text }]}>Help & Support</Text>
            {[
              ['How do I create an event?', 'Tap the + button on the My Events tab or the Home screen.'],
              ['How do smart suggestions work?', 'PrepMate tracks items you add and suggests them based on past usage.'],
              ['Can I reuse a checklist?', 'Yes — open any event, tap Edit, then use the refresh button to uncheck all items.'],
              ['How do I delete an event?', 'Swipe left on any event in My Events, or tap the menu.'],
            ].map(([q, a]) => (
              <View key={q} style={{ width: '100%', gap: 3 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{q}</Text>
                <Text style={{ fontSize: 13, color: c.textSecondary, lineHeight: 19 }}>{a}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: c.primary, width: '100%' }]} onPress={() => setHelpModal(false)}>
              <Text style={s.modalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Avatar card */}
        <View style={[s.avatarCard, { backgroundColor: c.white, borderColor: c.border }]}>
          <View style={[s.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <Text style={[s.profileName, { color: c.text }]}>{displayName || 'Unnamed User'}</Text>
          <Text style={{ fontSize: 13, color: c.textSecondary, marginBottom: 12 }}>{email}</Text>
          <TouchableOpacity style={[s.editNameBtn, { backgroundColor: c.primaryLight }]} onPress={openEditModal}>
            <Ionicons name="pencil" size={14} color={c.primary} />
            <Text style={{ fontSize: 13, color: c.primary, fontWeight: '500' }}>Edit name</Text>
          </TouchableOpacity>
          <View style={[s.statsRow, { borderTopColor: c.border }]}>
            <View style={s.statItem}>
              {statsLoading ? <ActivityIndicator size="small" color={c.primary} /> : <Text style={[s.statNumber, { color: c.primary }]}>{stats.events}</Text>}
              <Text style={{ fontSize: 12, color: c.textSecondary }}>Events</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: c.border }]} />
            <View style={s.statItem}>
              {statsLoading ? <ActivityIndicator size="small" color={c.primary} /> : <Text style={[s.statNumber, { color: c.primary }]}>{stats.items}</Text>}
              <Text style={{ fontSize: 12, color: c.textSecondary }}>Items Tracked</Text>
            </View>
          </View>
        </View>

        {/* Account menu */}
        <View style={s.menuSection}>
          <Text style={[s.menuSectionTitle, { color: c.textSecondary }]}>Account</Text>
          <View style={[s.menuCard, { backgroundColor: c.white, borderColor: c.border }]}>
            {[
              { id: 'edit_name',         icon: 'person-outline', label: 'Edit Display Name' },
              { id: 'smart_suggestions', icon: 'bulb-outline',   label: 'Smart Suggestions' },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}
                onPress={() => {
                  if (item.id === 'edit_name')         openEditModal();
                  if (item.id === 'smart_suggestions') navigation.navigate('SmartSuggestions');
                }}
                activeOpacity={0.7}
              >
                <View style={s.menuRowLeft}>
                  <View style={[s.menuIconWrap, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name={item.icon} size={20} color={c.primary} />
                  </View>
                  <Text style={[s.menuLabel, { color: c.text }]}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App menu */}
        <View style={s.menuSection}>
          <Text style={[s.menuSectionTitle, { color: c.textSecondary }]}>App</Text>
          <View style={[s.menuCard, { backgroundColor: c.white, borderColor: c.border }]}>

            {/* Dark mode toggle */}
            <View style={[s.menuRow, { borderBottomWidth: 1, borderBottomColor: c.border }]}>
              <View style={s.menuRowLeft}>
                <View style={[s.menuIconWrap, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={c.primary} />
                </View>
                <Text style={[s.menuLabel, { color: c.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor="#fff"
              />
            </View>

            {[
              { id: 'about', icon: 'information-circle-outline', label: 'About PrepMate' },
              { id: 'help',  icon: 'help-circle-outline',        label: 'Help & Support' },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}
                onPress={() => { if (item.id === 'about') setAboutModal(true); if (item.id === 'help') setHelpModal(true); }}
                activeOpacity={0.7}
              >
                <View style={s.menuRowLeft}>
                  <View style={[s.menuIconWrap, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name={item.icon} size={20} color={c.primary} />
                  </View>
                  <Text style={[s.menuLabel, { color: c.text }]}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout — no disabled prop, no loggingOut state */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <TouchableOpacity
            style={[s.logoutBtn, { backgroundColor: c.white, borderColor: c.error + '44' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={c.error} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.error }}>Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  avatarCard:    { marginHorizontal: 16, marginTop: 20, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1 },
  avatarCircle:  { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarInitials:{ fontSize: 34, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  profileName:   { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  editNameBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  statsRow:      { flexDirection: 'row', alignItems: 'center', width: '100%', borderTopWidth: 1, paddingTop: 16 },
  statItem:      { flex: 1, alignItems: 'center', gap: 4 },
  statNumber:    { fontSize: 24, fontWeight: 'bold' },
  statDivider:   { width: 1, height: 36 },
  menuSection:   { marginTop: 24, paddingHorizontal: 16 },
  menuSectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  menuCard:      { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  menuRowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconWrap:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel:     { fontSize: 15, fontWeight: '500' },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, borderWidth: 1 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:      { borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center', gap: 12 },
  modalTitle:    { fontSize: 19, fontWeight: 'bold', textAlign: 'center' },
  modalInput:    { width: '100%', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalError:    { fontSize: 12, alignSelf: 'flex-start', marginTop: -4 },
  modalActions:  { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalBtn:      { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalBtnOut:   { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalBtnOutText: { fontWeight: '500', fontSize: 15 },
});