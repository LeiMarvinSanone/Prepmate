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
import { COLORS } from '../constants/colors';
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
    { icon: '📋', label: catId, color: COLORS.primaryLight };

  const pluralise = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Smart Suggestions</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading suggestions…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    // Outer View with flex:1 guarantees the full device height is allocated
    // before SafeAreaView + ScrollView try to fill it. Without this wrapper,
    // SafeAreaView can collapse to 0 height on some Expo/RN versions, making
    // the ScrollView appear non-scrollable even though content overflows.
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea}>

        {/* ── Full history modal ── */}
        <Modal visible={historyModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>My Item History</Text>
                  {totalTracked > 0 && (
                    <Text style={styles.modalSubtitle}>
                      {pluralise(totalTracked, 'unique item')} tracked
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setHistoryModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {historyLoading ? (
                <View style={styles.centeredModal}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : fullHistory.length === 0 ? (
                <View style={styles.centeredModal}>
                  <Text style={styles.emptyIcon}>🗂️</Text>
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptyText}>
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
                      <View style={styles.historyRow}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>#{index + 1}</Text>
                        </View>
                        <View style={[styles.catDot, { backgroundColor: cat.color }]}>
                          <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyItemName} numberOfLines={1}>
                            {item.itemName}
                          </Text>
                          <Text style={styles.historyCatLabel}>{cat.label}</Text>
                        </View>
                        <View style={styles.usagePill}>
                          <Ionicons name="repeat" size={12} color={COLORS.primary} />
                          <Text style={styles.usageCount}>
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

        {/* ── Header with back button ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Suggestions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Scrollable body ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.pageSubRow}>
            <Text style={styles.pageSubtitle}>Based on your past events</Text>
            <View style={styles.headerIcon}>
              <Text style={{ fontSize: 22 }}>✨</Text>
            </View>
          </View>

          {/* Section 1 — Frequently Brought Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Brought Items</Text>
            {hasHistory ? (
              <>
                <Text style={styles.sectionSubtitle}>
                  Items you add most across all your events
                </Text>
                <View style={styles.chipGrid}>
                  {frequentItems.map((item) => {
                    const cat = getCategoryInfo(item.category);
                    return (
                      <View key={item.id} style={styles.frequentChip}>
                        <Text style={styles.frequentChipIcon}>{cat.icon}</Text>
                        <Text style={styles.frequentChipText} numberOfLines={1}>
                          {item.itemName}
                        </Text>
                        <View style={styles.usageTag}>
                          <Text style={styles.usageTagText}>×{item.usageCount}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity style={styles.viewHistoryBtn} onPress={openHistory}>
                  <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.viewHistoryText}>View Full History</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noHistoryCard}>
                <Text style={styles.noHistoryIcon}>🌱</Text>
                <Text style={styles.noHistoryTitle}>No history yet</Text>
                <Text style={styles.noHistoryText}>
                  Start adding items to your checklists and they'll appear here as smart suggestions.
                </Text>
              </View>
            )}
          </View>

          {/* Section 2 — You Might Need For… */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You Might Need For…</Text>
            <Text style={styles.sectionSubtitle}>
              {hasHistory
                ? 'Your most-used items per category'
                : 'Suggested starter items per category'}
            </Text>
            {SUGGESTION_CATEGORIES.map((cat) => {
              const personalItems = catSuggestions[cat.id] || [];
              const defaultItems  = DEFAULT_SUGGESTIONS[cat.id] || [];
              const displayItems  = personalItems.length >= 3
                ? personalItems
                : defaultItems.slice(0, 5);
              const isPersonal = personalItems.length >= 3;
              return (
                <View key={cat.id} style={styles.catCard}>
                  <View style={[styles.catCardHeader, { backgroundColor: cat.color }]}>
                    <Text style={styles.catCardIcon}>{cat.icon}</Text>
                    <View style={styles.catCardHeaderText}>
                      <Text style={styles.catCardTitle}>{cat.label}</Text>
                      <Text style={styles.catCardSubtitle}>{cat.subtitle}</Text>
                    </View>
                    {isPersonal && (
                      <View style={styles.personalBadge}>
                        <Text style={styles.personalBadgeText}>Your history</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.catItemList}>
                    {displayItems.map((itemName, idx) => (
                      <View key={idx} style={styles.catItemRow}>
                        <Ionicons name="ellipse" size={6} color={COLORS.primary} style={{ marginTop: 2 }} />
                        <Text style={styles.catItemText}>{itemName}</Text>
                        {isPersonal && idx === 0 && (
                          <View style={styles.topPickTag}>
                            <Text style={styles.topPickText}>top pick</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.refreshHint}>↓  Pull down to refresh</Text>
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer:  { flex: 1, backgroundColor: COLORS.background },
  safeArea:        { flex: 1 },
  scroll:          { flex: 1 },
  scrollContent:   { paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },

  pageSubRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 4, paddingBottom: 8,
  },
  pageSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },

  section:         { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle:    { fontSize: 17, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  frequentChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  frequentChipIcon: { fontSize: 15 },
  frequentChipText: { fontSize: 13, color: COLORS.text, fontWeight: '500', maxWidth: 110 },
  usageTag: {
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  usageTagText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },

  viewHistoryBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingVertical: 12,
  },
  viewHistoryText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  noHistoryCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  noHistoryIcon:  { fontSize: 40 },
  noHistoryTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  noHistoryText:  { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },

  catCard: {
    backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  catCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  catCardIcon:       { fontSize: 24 },
  catCardHeaderText: { flex: 1 },
  catCardTitle:      { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  catCardSubtitle:   { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  personalBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  personalBadgeText: { fontSize: 10, color: COLORS.white, fontWeight: '600' },
  catItemList:       { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  catItemRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catItemText:       { flex: 1, fontSize: 14, color: COLORS.text },
  topPickTag: {
    backgroundColor: '#FFF8E1', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  topPickText: { fontSize: 10, color: '#F57F17', fontWeight: '600' },

  refreshHint: {
    textAlign: 'center', fontSize: 12,
    color: COLORS.border, marginTop: 16, paddingBottom: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '80%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  modalTitle:    { fontSize: 19, fontWeight: 'bold', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  centeredModal: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: COLORS.border, gap: 10,
  },
  rankBadge:       { width: 30, alignItems: 'center' },
  rankText:        { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  catDot: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  historyInfo:     { flex: 1 },
  historyItemName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  historyCatLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  usagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  usageCount: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyIcon:  { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  emptyText:  { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
});