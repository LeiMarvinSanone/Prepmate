// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, StatusBar, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { COLORS } from '../constants/colors';
import { CATEGORIES } from '../constants/categories';
// Reuse the same initials + colour helpers from ProfileScreen
import { getInitials, getAvatarColor } from './ProfileScreen';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(CATEGORIES);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredCategories(CATEGORIES);
    } else {
      const filtered = CATEGORIES.filter((cat) =>
        cat.label.toLowerCase().includes(search.toLowerCase()) ||
        cat.subtitle.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [search]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  };

  const handleCategoryPress = (category) => {
    if (category.id === 'custom') {
      navigation.navigate('CreateEvent');
    } else {
      navigation.navigate('Main', {
        screen: 'MyEvents',
        params: { category: category },
      });
    }
  };

  // Build the same avatar the Profile tab shows
  const initials    = getInitials(user?.displayName, user?.email);
  const avatarColor = getAvatarColor(initials);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{getUserName()}! 👋</Text>
            <Text style={styles.subtitle}>What are you preparing for?</Text>
          </View>

          {/* Avatar button — matches Profile tab exactly */}
          <TouchableOpacity
            style={[styles.avatarCircle, { backgroundColor: avatarColor }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Categories Grid ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={styles.sectionCount}>{filteredCategories.length} found</Text>
        </View>

        {filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: category.color }]}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 20, paddingBottom: 16,
  },
  headerLeft: { flex: 1 },
  greeting:   { fontSize: 14, color: COLORS.textSecondary },
  userName:   { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  subtitle:   { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  // Same dimensions as ProfileScreen's avatarCircle
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22, marginLeft: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 17, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, outline: 'none' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 24 },
  categoryCard: {
    width: '47%', borderRadius: 16, padding: 16, minHeight: 120, justifyContent: 'flex-end',
  },
  categoryIcon:     { fontSize: 32, marginBottom: 8 },
  categoryLabel:    { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  categorySubtitle: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },

  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:     { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary },
});