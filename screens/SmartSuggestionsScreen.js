// screens/SmartSuggestionsScreen.js
// KEY FIX: Use Platform-aware root container.
// On web, SafeAreaView collapses and ScrollView won't scroll.
// Solution: root = plain View with flex:1; SafeAreaView inside it.
// ScrollView must be a DIRECT child of SafeAreaView with NO style={{flex:1}}.
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, FlatList, ActivityIndicator,
  SafeAreaView, Modal, RefreshControl, Platform,
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

// On web, SafeAreaView doesn't provide height to children.
// Use a plain View instead so the ScrollView gets proper height.
const RootContainer = ({ style, children }) =>
  Platform.OS === 'web'
    ? <View style={style}>{children}</View>
    : <SafeAreaView style={style}>{children}</SafeAreaView>;

export default function SmartSuggestionsScreen({ navigation }) {
  const { colors } = useTheme();
  const C = colors;

  const [frequentItems,  setFrequentItems]  = useState([]);
  const [catSuggestions, setCatSuggestions] = useState({});
  const [fullHistory,    setFullHistory]    = useState([]);
  const [totalTracked,   setTotalTracked]   = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [historyModal,   setHistoryModal]   = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasHistory,     setHasHistory]     = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

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

  const getCatInfo = (catId) =>
    CATEGORIES.find((c) => c.id === catId) || { icon: '📋', label: catId, color: C.primaryLight };

  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const Header = () => (
    <View style={[s.header, { backgroundColor: C.background }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[s.backBtn, { backgroundColor: C.primaryLight }]}
      >
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: C.text }]}>Smart Suggestions</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <RootContainer style={{ flex: 1 }}>
          <Header />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ fontSize: 14, color: C.textSecondary }}>Loading suggestions...</Text>
          </View>
        </RootContainer>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <RootContainer style={{ flex: 1 }}>

        {/* History modal */}
        <Modal visible={historyModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: C.white }]}>
              <View style={[s.sheetHandle, { backgroundColor: C.border }]} />
              <View style={s.modalHdr}>
                <View>
                  <Text style={[s.modalTitle, { color: C.text }]}>My Item History</Text>
                  {totalTracked > 0 && (
                    <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                      {pl(totalTracked, 'unique item')} tracked
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setHistoryModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
              {historyLoading ? (
                <View style={s.centeredModal}><ActivityIndicator size="large" color={C.primary} /></View>
              ) : fullHistory.length === 0 ? (
                <View style={s.centeredModal}>
                  <Text style={{ fontSize: 44 }}>🗂️</Text>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: C.text }}>No history yet</Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19 }}>
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
                    const cat = getCatInfo(item.category);
                    return (
                      <View style={[s.historyRow, { borderBottomColor: C.border }]}>
                        <Text style={{ fontSize: 12, color: C.textSecondary, fontWeight: '600', width: 30, textAlign: 'center' }}>#{index + 1}</Text>
                        <View style={[s.catDot, { backgroundColor: cat.color }]}>
                          <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }} numberOfLines={1}>{item.itemName}</Text>
                          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }}>{cat.label}</Text>
                        </View>
                        <View style={[s.usagePill, { backgroundColor: C.primaryLight }]}>
                          <Ionicons name="repeat" size={12} color={C.primary} />
                          <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>{pl(item.usageCount, 'time')}</Text>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </Modal>

        <Header />

        {/* NO flex:1 on ScrollView — that's what broke scrolling on web */}
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.primary} />}
        >
          <View style={s.pageSubRow}>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>Based on your past events</Text>
            <View style={[s.headerIcon, { backgroundColor: C.primaryLight }]}>
              <Text style={{ fontSize: 25 }}>😸</Text>
            </View>
          </View>

          {/* Section 1 */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.text }]}>Frequently Brought Items</Text>
            {hasHistory ? (
              <>
                <Text style={[s.sectionSub, { color: C.textSecondary }]}>Items you add most across all your events</Text>
                <View style={s.chipGrid}>
                  {frequentItems.map((item) => {
                    const cat = getCatInfo(item.category);
                    return (
                      <View key={item.id} style={[s.frequentChip, { backgroundColor: C.white, borderColor: C.border }]}>
                        <Text style={{ fontSize: 15 }}>{cat.icon}</Text>
                        <Text style={{ fontSize: 13, color: C.text, fontWeight: '500', maxWidth: 110 }} numberOfLines={1}>{item.itemName}</Text>
                        <View style={[s.usageTag, { backgroundColor: C.primaryLight }]}>
                          <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700' }}>x{item.usageCount}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity style={[s.viewHistBtn, { backgroundColor: C.primaryLight }]} onPress={openHistory}>
                  <Ionicons name="time-outline" size={16} color={C.primary} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>View Full History</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={[s.noHistCard, { backgroundColor: C.white, borderColor: C.border }]}>
                <Text style={{ fontSize: 40 }}>🌱</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.text }}>No history yet</Text>
                <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19 }}>
                  Start adding items to your checklists and they'll appear here.
                </Text>
              </View>
            )}
          </View>

          {/* Section 2 */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.text }]}>You Might Need For...</Text>
            <Text style={[s.sectionSub, { color: C.textSecondary }]}>
              {hasHistory ? 'Your most-used items per category' : 'Suggested starter items per category'}
            </Text>
            {SUGGESTION_CATEGORIES.map((cat) => {
              const personal = catSuggestions[cat.id] || [];
              const defaults = DEFAULT_SUGGESTIONS[cat.id] || [];
              const display  = personal.length >= 3 ? personal : defaults.slice(0, 5);
              const isPers   = personal.length >= 3;
              return (
                <View key={cat.id} style={[s.catCard, { backgroundColor: C.white, borderColor: C.border }]}>
                  <View style={[s.catCardHdr, { backgroundColor: cat.color }]}>
                    <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' }}>{cat.label}</Text>
                      <Text style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{cat.subtitle}</Text>
                    </View>
                    {isPers && (
                      <View style={[s.persBadge, { backgroundColor: C.primary }]}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>Your history</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.catItemList}>
                    {display.map((name, idx) => (
                      <View key={idx} style={s.catItemRow}>
                        <Ionicons name="ellipse" size={6} color={C.primary} style={{ marginTop: 2 }} />
                        <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{name}</Text>
                        {isPers && idx === 0 && (
                          <View style={s.topPickTag}>
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

          <Text style={{ textAlign: 'center', fontSize: 12, color: C.border, marginTop: 16, paddingBottom: 8 }}>
            Pull down to refresh
          </Text>
        </ScrollView>

      </RootContainer>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 48 },
  pageSubRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerIcon:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  section:     { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle:{ fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  sectionSub:  { fontSize: 12, marginBottom: 14 },
  chipGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  frequentChip:{ flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1 },
  usageTag:    { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  viewHistBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 12 },
  noHistCard:  { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, gap: 8 },
  catCard:     { borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
  catCardHdr:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  persBadge:   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  catItemList: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  catItemRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topPickTag:  { backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:  { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHdr:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle:  { fontSize: 19, fontWeight: 'bold' },
  centeredModal:{ alignItems: 'center', paddingVertical: 48, gap: 10 },
  historyRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  catDot:      { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  usagePill:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
});