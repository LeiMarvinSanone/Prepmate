// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, StatusBar, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES } from '../constants/categories';
import { getInitials, getAvatarColor } from './ProfileScreen';

export default function HomeScreen({ navigation }) {
  const { colors: C, isDark } = useTheme();
  const [user,     setUser]     = useState(null);
  const [search,   setSearch]   = useState('');
  const [filtered, setFiltered] = useState(CATEGORIES);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return unsub;
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(!q ? CATEGORIES : CATEGORIES.filter(c =>
      c.label.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    ));
  }, [search]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };

  const userName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email)       return user.email.split('@')[0];
    return 'there';
  };

  const onCategory = (cat) => {
    if (cat.id === 'custom') navigation.navigate('CreateEvent');
    else navigation.navigate('Main', { screen: 'MyEvents', params: { category: cat } });
  };

  const initials    = getInitials(user?.displayName, user?.email);
  const avatarColor = getAvatarColor(initials);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.white} />
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>{greeting()},</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: C.text, marginTop: 2 }}>{userName()}!👋🏻</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>What are you preparing for?</Text>
          </View>
          <TouchableOpacity
            style={[s.avatarCircle, { backgroundColor: avatarColor }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={s.avatarInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[s.searchBox, { backgroundColor: C.background, borderColor: C.border }]}>
          <Ionicons name="search" size={20} color={C.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[s.searchInput, { color: C.text }]}
            placeholder="Search categories..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={C.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section header */}
        <View style={s.secHeader}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: C.text }}>Categories</Text>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>{filtered.length} found</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 6 }}>No categories found</Text>
            <Text style={{ fontSize: 14, color: C.textSecondary }}>Try a different search term</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {filtered.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catCard, { backgroundColor: isDark ? C.white : cat.color }]}
                onPress={() => onCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</Text>
                {/* Always use C.text so it's readable in both modes.
                    Category pastel backgrounds are too light for dark mode,
                    so in dark mode we use the card surface color (C.white = #1E1E1E)
                    which gives enough contrast for C.text (#F0F0F0). */}
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.text, marginBottom: 4 }}>
                  {cat.label}
                </Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 16 }}>
                  {cat.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, paddingBottom: 16 },
  avatarCircle:  { width: 44, height: 44, borderRadius: 22, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  avatarInitials:{ fontSize: 17, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  searchBox:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, marginBottom: 20 },
  searchInput:   { flex: 1, fontSize: 15 },
  secHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 24 },
  catCard:       { width: '47%', borderRadius: 16, padding: 16, minHeight: 120, justifyContent: 'flex-end' },
});