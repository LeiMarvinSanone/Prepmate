// screens/SmartSuggestionsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, FlatList, ActivityIndicator,
  SafeAreaView, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES } from '../constants/categories';
import { DEFAULT_SUGGESTIONS } from '../constants/defaultSuggestions';
import {
  getAllFrequentItems,
  getAllItemHistory,
  getFrequentItemsByCategory,
} from '../services/historyService';

const SUGGESTION_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'custom' && c.id !== 'more'
);

export default function SmartSuggestionsScreen({ navigation }) {
  const { colors } = useTheme();

  const [frequentItems,  setFrequentItems]  = useState([]);
  const [catSuggestions, setCatSuggestions] = useState({});
  const [fullHistory,    setFullHistory]    = useState([]);
  const [totalTracked,   setTotalTracked]   = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [historyModal,   setHistoryModal]   = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasHistory,     setHasHistory]     = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const catIds = SUGGESTION_CATEGORIES.map((c) => c.id);
      const [frequent, byCat] = await Promise.all([
        getAllFrequentItems(user.uid, 12),
        getFrequentItemsByCategory(user.uid, catIds, 5),
      ]);
      setFrequentItems(frequent);
      setCatSuggestions(byCat);
      setHasHistory(frequent.length > 0);
    } catch (err) {
      console.error('SmartSuggestions load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openHistory = async () => {
    setHistoryModal(true);
    setHistoryLoading(true);
    try {
      const user = auth.currentUser;
      const history = await getAllItemHistory(user.uid);
      setFullHistory(history);
      setTotalTracked(history.length);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getCategoryInfo = (catId) =>
    CATEGORIES.find((c) => c.id === catId) ||
    { icon: '📋', label: catId, color: colors.primaryLight };

  const pluralise = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.backBtn, { backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Smart Suggestions</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Loading suggestions...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>

        <Modal visible={historyModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.white }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>My Item History</Text>
                  {totalTracked > 0 && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {pluralise(totalTracked, 'unique item')} tracked
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setHistoryModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {historyLoading ? (
                <View style={styles.centeredModal}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : fullHistory.length === 0 ? (
                <View style={styles.centeredModal}>
                  <Text style={{ fontSize: 44 }}>🗂️</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>No history yet</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }}>
                    Items you add to checklists will appear here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={fullHistory}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 32 }}
                  renderItem={({ item, index }) => {
                    const cat = getCategoryInfo(item.category);
                    return (
                      <View style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.rankBadge}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>#{index + 1}</Text>
                        </View>
                        <View style={[styles.catDot, { backgroundColor: cat.color }]}>
                          <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>{item.itemName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>{cat.label}</Text>
                        </View>
                        <View style={[styles.usagePill, { backgroundColor: colors.primaryLight }]}>
                          <Ionicons name="repeat" size={12} color={colors.primary} />
                          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                            {pluralise(item.usageCount, 'time')}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </Modal>

        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.backBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Smart Suggestions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ScrollView is a DIRECT child of SafeAreaView — no wrapper View in between.
            Adding flex:1 View wrappers between SafeAreaView and ScrollView breaks
            height measurement on Android/Expo and prevents scrolling. */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
          }
        >
          <View style={styles.pageSubRow}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Based on your past events</Text>
            <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 22 }}>✨</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Brought Items</Text>
            {hasHistory ? (
              <>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Items you add most across all your events</Text>
                <View style={styles.chipGrid}>
                  {frequentItems.map((item) => {
                    const cat = getCategoryInfo(item.category);
                    return (
                      <View key={item.id} style={[styles.frequentChip, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <Text style={{ fontSize: 15 }}>{cat.icon}</Text>
                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', maxWidth: 110 }} numberOfLines={1}>{item.itemName}</Text>
                        <View style={[styles.usageTag, { backgroundColor: colors.primaryLight }]}>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>x{item.usageCount}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity style={[styles.viewHistoryBtn, { backgroundColor: colors.primaryLight }]} onPress={openHistory}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>View Full History</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.noHistoryCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Text style={{ fontSize: 40 }}>🌱</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>No history yet</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }}>
                  Start adding items to your checklists and they'll appear here as smart suggestions.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>You Might Need For...</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              {hasHistory ? 'Your most-used items per category' : 'Suggested starter items per category'}
            </Text>
            {SUGGESTION_CATEGORIES.map((cat) => {
              const personalItems = catSuggestions[cat.id] || [];
              const defaultItems  = DEFAULT_SUGGESTIONS[cat.id] || [];
              const displayItems  = personalItems.length >= 3 ? personalItems : defaultItems.slice(0, 5);
              const isPersonal    = personalItems.length >= 3;
              return (
                <View key={cat.id} style={[styles.catCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
                  <View style={[styles.catCardHeader, { backgroundColor: cat.color }]}>
                    <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}>{cat.label}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>{cat.subtitle}</Text>
                    </View>
                    {isPersonal && (
                      <View style={[styles.personalBadge, { backgroundColor: colors.primary }]}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>Your history</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.catItemList}>
                    {displayItems.map((itemName, idx) => (
                      <View key={idx} style={styles.catItemRow}>
                        <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 2 }} />
                        <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{itemName}</Text>
                        {isPersonal && idx === 0 && (
                          <View style={styles.topPickTag}>
                            <Text style={{ fontSize: 10, color: '#F57F17', fontWeight: '600' }}>top pick</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={{ textAlign: 'center', fontSize: 12, color: colors.border, marginTop: 16, paddingBottom: 8 }}>
            Pull down to refresh
          </Text>
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 48 },
  pageSubRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8,
  },
  headerIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  section:    { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  sectionSub:   { fontSize: 12, marginBottom: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  frequentChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1,
  },
  usageTag:  { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  viewHistoryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 12,
  },
  noHistoryCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, gap: 8 },
  catCard:       { borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
  catCardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  personalBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  catItemList:   { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  catItemRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topPickTag:    { backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '80%' },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle:    { fontSize: 19, fontWeight: 'bold' },
  centeredModal: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  historyRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  rankBadge:     { width: 30, alignItems: 'center' },
  catDot:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  usagePill:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
});