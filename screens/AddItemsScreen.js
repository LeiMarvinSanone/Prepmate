// screens/AddItemsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
  Alert, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase';
import {
  addChecklistItem, getChecklistItems,
  deleteChecklistItem, toggleChecklistItem,
} from '../services/checklistService';
import { getFrequentItems, trackItemUsage } from '../services/historyService';
import { DEFAULT_SUGGESTIONS } from '../constants/defaultSuggestions';

// Max suggestion chips shown at once — keeps the UI clean
const MAX_SUGGESTIONS = 8;

export default function AddItemsScreen({ navigation, route }) {
  const { colors: COLORS } = useTheme();
  const { eventId, eventName, category } = route.params;

  const [items,       setItems]       = useState([]);
  const [suggestions, setSuggestions] = useState([]);  // final merged list
  const [newItem,     setNewItem]     = useState('');
  const [loading,     setLoading]     = useState(true);
  const [adding,      setAdding]      = useState(false);
  // 'history' | 'default' — lets us show the right label on the chip section
  const [suggestionSource, setSuggestionSource] = useState('default');

  useEffect(() => {
    fetchItems();
    fetchSuggestions();
  }, []);

  // ─── Fetch current checklist items ───────────────────────────────────────

  const fetchItems = async () => {
    try {
      const fetched = await getChecklistItems(eventId);
      setItems(fetched);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Build merged suggestion list ────────────────────────────────────────
  // Priority: personal history (already sorted by usageCount desc) → defaults
  // We cap at MAX_SUGGESTIONS total chips and filter as the checklist grows.

  const fetchSuggestions = async () => {
    try {
      const user = auth.currentUser;

      // 1. Try personal history first
      let historySuggestions = [];
      if (user && category) {
        const frequent = await getFrequentItems(user.uid, category, MAX_SUGGESTIONS);
        historySuggestions = frequent.map(f => f.itemName);
      }

      if (historySuggestions.length >= 3) {
        // Enough personal data — use it exclusively so it feels personalised
        setSuggestions(historySuggestions);
        setSuggestionSource('history');
        return;
      }

      // 2. Fall back to defaults, filling remaining slots
      const defaults = DEFAULT_SUGGESTIONS[category] || DEFAULT_SUGGESTIONS['custom'];
      const historySet = new Set(historySuggestions.map(s => s.toLowerCase()));

      // Deduplicate: exclude items already in personal history
      const filteredDefaults = defaults.filter(
        d => !historySet.has(d.toLowerCase())
      );

      // Merge: personal history first, then defaults up to the cap
      const slotsLeft = MAX_SUGGESTIONS - historySuggestions.length;
      const merged = [
        ...historySuggestions,
        ...filteredDefaults.slice(0, slotsLeft),
      ];

      setSuggestions(merged);
      setSuggestionSource(historySuggestions.length > 0 ? 'history' : 'default');
    } catch (err) {
      // If Firestore fails for any reason, fall back silently to defaults
      console.error('Error fetching suggestions:', err);
      const defaults = DEFAULT_SUGGESTIONS[category] || DEFAULT_SUGGESTIONS['custom'];
      setSuggestions(defaults.slice(0, MAX_SUGGESTIONS));
      setSuggestionSource('default');
    }
  };

  // ─── Checklist operations ─────────────────────────────────────────────────

  const handleAddItem = async (itemName = newItem) => {
    const trimmed = itemName.trim();
    if (!trimmed) return;

    if (items.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already added', 'This item is already in your checklist.');
      return;
    }

    setAdding(true);
    try {
      const user = auth.currentUser;
      await addChecklistItem(user.uid, eventId, trimmed);
      await trackItemUsage(user.uid, trimmed, category);
      setNewItem('');
      fetchItems();
    } catch {
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteChecklistItem(itemId);
      fetchItems();
    } catch {
      Alert.alert('Error', 'Failed to delete item.');
    }
  };

  const handleToggle = async (itemId, currentStatus) => {
    try {
      await toggleChecklistItem(itemId, currentStatus);
      fetchItems();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // ─── Derived: filter out chips already in the checklist ──────────────────

  const visibleSuggestions = suggestions.filter(
    s => !items.some(i => i.name.toLowerCase() === s.toLowerCase())
  );

  // ─── Suggestion section label ─────────────────────────────────────────────

  const suggestionLabel = suggestionSource === 'history'
    ? `⭐ Based on your history`
    : `💡 Suggested for ${category ? category.charAt(0).toUpperCase() + category.slice(1) : 'this event'}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleToggle(item.id, item.isChecked)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={item.isChecked ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.isChecked ? COLORS.primary : COLORS.textSecondary}
        />
      </TouchableOpacity>
      <Text style={[styles.itemName, item.isChecked && styles.itemChecked]}>
        {item.name}
      </Text>
      <TouchableOpacity
        onPress={() => handleDeleteItem(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  const styles = makeStyles(COLORS);
  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add Items</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{eventName}</Text>
        </View>
        {/* Done → back to ChecklistDetail, not MyEvents */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ChecklistDetail', { eventId, eventName })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* ── Add item input ── */}
      <View style={styles.addWrapper}>
        <TextInput
          style={styles.addInput}
          placeholder="Type an item and tap Add…"
          value={newItem}
          onChangeText={setNewItem}
          placeholderTextColor={COLORS.textSecondary}
          onSubmitEditing={() => handleAddItem()}
          returnKeyType="done"
          maxLength={60}
        />
        <TouchableOpacity
          style={[styles.addButton, !newItem.trim() && styles.addButtonDisabled]}
          onPress={() => handleAddItem()}
          disabled={adding || !newItem.trim()}
        >
          {adding ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Suggestion chips ── */}
      {visibleSuggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>{suggestionLabel}</Text>
          <View style={styles.suggestionsList}>
            {visibleSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleAddItem(suggestion)}
                activeOpacity={0.75}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
                <Ionicons name="add" size={15} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Checklist ── */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Checklist</Text>
          <Text style={styles.listCount}>{items.length} items</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyText}>
              Type above or tap a suggestion to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ── Add input ──
  addWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    outline: 'none',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },

  // ── Suggestions ──
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // ── Checklist ──
  listSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  itemChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});