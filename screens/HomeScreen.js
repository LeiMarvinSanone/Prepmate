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
  const { colors, isDark } = useTheme();
  const [user,               setUser]               = useState(null);
  const [search,             setSearch]             = useState('');
  const [filteredCategories, setFilteredCategories] = useState(CATEGORIES);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => setUser(currentUser));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredCategories(CATEGORIES);
    } else {
      setFilteredCategories(CATEGORIES.filter((cat) =>
        cat.label.toLowerCase().includes(search.toLowerCase()) ||
        cat.subtitle.toLowerCase().includes(search.toLowerCase())
      ));
    }
  }, [search]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email)       return user.email.split('@')[0];
    return 'there';
  };

  const handleCategoryPress = (category) => {
    if (category.id === 'custom') {
      navigation.navigate('CreateEvent');
    } else {
      navigation.navigate('Main', { screen: 'MyEvents', params: { category } });
    }
  };

  const initials    = getInitials(user?.displayName, user?.email);
  const avatarColor = getAvatarColor(initials);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{getGreeting()},</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 2 }}>{getUserName()}! 👋</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>What are you preparing for?</Text>
          </View>
          {/* Same initials avatar as Profile tab */}
          <TouchableOpacity
            style={[styles.avatarCircle, { backgroundColor: avatarColor }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search categories..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Categories</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{filteredCategories.length} found</Text>
        </View>

        {filteredCategories.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 6 }}>No categories found</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Try a different search term</Text>
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
                <Text style={{ fontSize: 32, marginBottom: 8 }}>{category.icon}</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>{category.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>{category.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, paddingBottom: 16 },
  avatarCircle:  { width: 44, height: 44, borderRadius: 22, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  avatarInitials:{ fontSize: 17, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, marginBottom: 20 },
  searchInput:   { flex: 1, fontSize: 15, outline: 'none' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 24 },
  categoryCard:  { width: '47%', borderRadius: 16, padding: 16, minHeight: 120, justifyContent: 'flex-end' },
});