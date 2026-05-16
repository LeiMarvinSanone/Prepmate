// screens/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, TextInput, ActivityIndicator,
  SafeAreaView, Switch, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { getUserEvents } from '../services/eventService';
import { getAllItemHistory } from '../services/historyService';
import { useModalFocus, clearAccessibilityFocus } from '../hooks/useModalFocus';

// ── Exported so HomeScreen can build the same avatar ──────────────────────────
export const getInitials = (displayName, email) => {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
};
const AVATAR_BG = ['#2E7D32','#1565C0','#6A1B9A','#AD1457','#E65100','#00695C'];
export const getAvatarColor = (initials) =>
  AVATAR_BG[(initials || '?').charCodeAt(0) % AVATAR_BG.length];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { colors: C, isDark, toggleTheme, theme } = useTheme();
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
  // State for logout confirmation modal (replaces Alert.alert)
  const [logoutModal,  setLogoutModal]  = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);

  // Hook to safely close logout modal while clearing focus to prevent aria-hidden warnings
  const closeLogoutModal = useModalFocus(logoutModal, setLogoutModal);

  useFocusEffect(useCallback(() => {
    setDisplayName(auth.currentUser?.displayName || '');
    loadStats();
  }, []));

  const loadStats = async () => {
    if (!user) { setStatsLoading(false); return; }
    setStatsLoading(true);
    try {
      const [evR, hiR] = await Promise.allSettled([
        getUserEvents(user.uid),
        getAllItemHistory(user.uid),
      ]);
      setStats({
        events: evR.status === 'fulfilled' ? evR.value.length : 0,
        items:  hiR.status === 'fulfilled' ? hiR.value.length : 0,
      });
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  };

  // ── Logout: Show confirmation modal first, then signOut if confirmed ──────────────
  // Opens the logout modal instead of using Alert.alert
  const handleLogoutPress = () => {
    console.log('Logout pressed');
    setLogoutModal(true);
  };

  // ── Confirm logout: signOut then let Firebase auth state trigger navigation ──────────
  // Only called when user confirms in the logout modal
  // IMPORTANT: Do NOT manually navigate after signOut!
  // Firebase onAuthStateChanged in App.js will detect user === null
  // and automatically switch to the auth stack (Splash → Login)
  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      // Clear focus to prevent accessibility warnings
      clearAccessibilityFocus();
      // STOP HERE - Let Firebase auth state change trigger navigation
      // The onAuthStateChanged listener in App.js will:
      // 1. Detect user is now null
      // 2. Re-render AppNavigator
      // 3. Show auth stack (Splash → Login)
      // NO manual navigation needed!
    } catch (err) {
      console.error('Logout error:', err);
      // If logout fails, close modal and let user try again
      setLogoutModal(false);
      setLoggingOut(false);
    }
  };

  const openEdit = () => { setNewName(displayName); setNameError(''); setEditModal(true); };
  const handleSaveName = async () => {
    const t = newName.trim();
    if (!t) { setNameError('Name cannot be empty.'); return; }
    if (t === displayName) { setEditModal(false); return; }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: t });
      setDisplayName(t);
      setEditModal(false);
    } catch { setNameError('Could not update. Try again.'); }
    finally { setSavingName(false); }
  };

  const initials    = getInitials(displayName, user?.email);
  const avatarColor = getAvatarColor(initials);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>

      {/* Edit name modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.mBox, { backgroundColor: C.white }]}>
            <Text style={[s.mTitle, { color: C.text }]}>Edit Display Name</Text>
            <TextInput
              style={[s.mInput, { borderColor: nameError ? C.error : C.border, backgroundColor: C.background, color: C.text }]}
              value={newName} onChangeText={(t) => { setNewName(t); setNameError(''); }}
              placeholder="Your name" placeholderTextColor={C.textSecondary}
              autoFocus maxLength={50} returnKeyType="done" onSubmitEditing={handleSaveName}
            />
            {!!nameError && <Text style={{ fontSize: 12, color: C.error, alignSelf: 'flex-start', marginTop: -4 }}>{nameError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 }}>
              <TouchableOpacity style={[s.mBtnOut, { borderColor: C.border }]} onPress={() => setEditModal(false)} disabled={savingName}>
                <Text style={{ color: C.text, fontWeight: '500', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, { backgroundColor: C.primary }]} onPress={handleSaveName} disabled={savingName}>
                {savingName ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.mBtnTxt}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout confirmation modal — replaces Alert.alert */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.mBox, { backgroundColor: C.white }]}>
            <Text style={{ fontSize: 55 }}>❓</Text>
            <Text style={[s.mTitle, { color: C.text }]}>Log Out</Text>
            <Text style={{ fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              Are you sure you want to log out?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
              <TouchableOpacity 
                style={[s.mBtnOut, { borderColor: C.border }]} 
                onPress={closeLogoutModal}
                disabled={loggingOut}
              >
                <Text style={{ color: C.text, fontWeight: '500', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.mBtn, { backgroundColor: C.error }]} 
                onPress={handleLogoutConfirm}
                disabled={loggingOut}
              >
                {loggingOut ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.mBtnTxt}>Log Out</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About modal */}
      <Modal visible={aboutModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.mBox, { backgroundColor: C.white }]}>
            <Image
              source={require('../assets/prepmateicon1.png')}
              style={s.aboutLogo}
              resizeMode="contain"
            />
            <Text style={[s.mTitle, { color: C.text }]}>PrepMate</Text>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>Version 1.0.0</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Smart checklist app for every event, big or small. Plan your trips, projects, and daily tasks with ease.
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Built with React Native (Expo) and Firebase.
            </Text>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: C.primary, width: '100%' }]} onPress={() => setAboutModal(false)}>
              <Text style={s.mBtnTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help modal */}
      <Modal visible={helpModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.mBox, { backgroundColor: C.white, maxHeight: '80%' }]}>
            <Text style={{ fontSize: 60 }}>🫡</Text>
            <Text style={[s.mTitle, { color: C.text }]}>Help & Support</Text>
            {[
              ['How do I create an event?', 'Tap the + button on My Events or the Home screen.'],
              ['How do smart suggestions work?', 'PrepMate tracks items you add and suggests them based on past usage.'],
              ['Can I reuse a checklist?', 'Yes — open any event, tap Edit or just simply tap refresh button to uncheck all items.'],
              ['How do I delete an event?', 'Swipe left on any event in My Events, or tap the ⋯ menu.'],
            ].map(([q, a]) => (
              <View key={q} style={{ width: '100%', gap: 3 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{q}</Text>
                <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>{a}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.mBtn, { backgroundColor: C.primary, width: '100%' }]} onPress={() => setHelpModal(false)}>
              <Text style={s.mBtnTxt}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Avatar card */}
        <View style={[s.avatarCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <View style={[s.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <Text style={[s.profileName, { color: C.text }]}>{displayName || 'Unnamed User'}</Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>{user?.email || ''}</Text>
          <TouchableOpacity style={[s.editBtn, { backgroundColor: C.primaryLight }]} onPress={openEdit}>
            <Ionicons name="pencil" size={14} color={C.primary} />
            <Text style={{ fontSize: 13, color: C.primary, fontWeight: '500' }}>Edit name</Text>
          </TouchableOpacity>
          <View style={[s.statsRow, { borderTopColor: C.border }]}>
            <View style={s.statItem}>
              {statsLoading ? <ActivityIndicator size="small" color={C.primary} /> : <Text style={[s.statNum, { color: C.primary }]}>{stats.events}</Text>}
              <Text style={{ fontSize: 12, color: C.textSecondary }}>Events</Text>
            </View>
            <View style={[s.statDiv, { backgroundColor: C.border }]} />
            <View style={s.statItem}>
              {statsLoading ? <ActivityIndicator size="small" color={C.primary} /> : <Text style={[s.statNum, { color: C.primary }]}>{stats.items}</Text>}
              <Text style={{ fontSize: 12, color: C.textSecondary }}>Items Tracked</Text>
            </View>
          </View>
        </View>

        {/* Account menu */}
        <View style={s.menuSection}>
          <Text style={[s.menuSecTitle, { color: C.textSecondary }]}>Account</Text>
          <View style={[s.menuCard, { backgroundColor: C.white, borderColor: C.border }]}>
            {[
              { id: 'edit',       icon: 'person-outline', label: 'Edit Display Name' },
              { id: 'suggestions',icon: 'bulb-outline',   label: 'Smart Suggestions' },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => {
                  if (item.id === 'edit')        openEdit();
                  if (item.id === 'suggestions') navigation.navigate('SmartSuggestions');
                }}
                activeOpacity={0.7}
              >
                <View style={s.menuLeft}>
                  <View style={[s.menuIcon, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name={item.icon} size={20} color={C.primary} />
                  </View>
                  <Text style={[s.menuLabel, { color: C.text }]}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App menu */}
        <View style={s.menuSection}>
          <Text style={[s.menuSecTitle, { color: C.textSecondary }]}>App</Text>
          <View style={[s.menuCard, { backgroundColor: C.white, borderColor: C.border }]}>
            {/* Dark mode row */}
            <View style={[s.menuRow, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={s.menuLeft}>
                <View style={[s.menuIcon, { backgroundColor: C.primaryLight }]}>
                  <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={C.primary} />
                </View>
                <Text style={[s.menuLabel, { color: C.text }]}>Dark Mode</Text>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: C.border, true: C.primary }} thumbColor="#fff" />
            </View>
            {[
              { id: 'about', icon: 'information-circle-outline', label: 'About PrepMate' },
              { id: 'help',  icon: 'help-circle-outline',        label: 'Help & Support' },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => { if (item.id === 'about') setAboutModal(true); if (item.id === 'help') setHelpModal(true); }}
                activeOpacity={0.7}
              >
                <View style={s.menuLeft}>
                  <View style={[s.menuIcon, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name={item.icon} size={20} color={C.primary} />
                  </View>
                  <Text style={[s.menuLabel, { color: C.text }]}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout — always tappable, opens confirmation modal */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <TouchableOpacity
            style={[s.logoutBtn, { backgroundColor: C.white, borderColor: C.error + '55' }]}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={C.error} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.error }}>Log Out</Text>
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
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  statsRow:      { flexDirection: 'row', alignItems: 'center', width: '100%', borderTopWidth: 1, paddingTop: 16 },
  statItem:      { flex: 1, alignItems: 'center', gap: 4 },
  statNum:       { fontSize: 24, fontWeight: 'bold' },
  statDiv:       { width: 1, height: 36 },
  menuSection:   { marginTop: 24, paddingHorizontal: 16 },
  menuSecTitle:  { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  menuCard:      { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  menuLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIcon:      { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel:     { fontSize: 15, fontWeight: '500' },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, borderWidth: 1 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  mBox:          { borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center', gap: 12 },
  aboutLogo:     { width: 200, height: 200, marginBottom: 8 },
  mTitle:        { fontSize: 19, fontWeight: 'bold', textAlign: 'center' },
  mInput:        { width: '100%', borderWidth: 0, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  mBtn:          { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  mBtnTxt:       { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  mBtnOut:       { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});