// screens/ChecklistDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator,
  SafeAreaView, Modal, Alert, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import {
  getChecklistItems,
  toggleChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getChecklistProgress,
} from '../services/checklistService';
import { getEvent } from '../services/eventService';
import { CATEGORIES } from '../constants/categories';

export default function ChecklistDetailScreen({ navigation, route }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const { eventId, eventName } = route.params;

  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { id, name }
  const [deleteModal, setDeleteModal] = useState({ visible: false, itemId: null });
  const [progress, setProgress] = useState({ checked: 0, total: 0, percentage: 0 });

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedEvent, fetchedItems] = await Promise.all([
        getEvent(eventId),
        getChecklistItems(eventId),
      ]);
      setEvent(fetchedEvent);
      setItems(fetchedItems);
      setProgress(getChecklistProgress(fetchedItems));
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh every time screen comes into focus (e.g. returning from AddItems)
  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Reset edit mode when returning
      setEditMode(false);
      setEditingItem(null);
    }, [eventId])
  );

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || {
      icon: '📋', label: 'Event', color: COLORS.primaryLight,
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  // ─── Item actions ─────────────────────────────────────────────────────────

  const handleToggle = async (itemId, currentStatus) => {
    // Optimistic update
    const updated = items.map(i =>
      i.id === itemId ? { ...i, isChecked: !currentStatus } : i
    );
    setItems(updated);
    setProgress(getChecklistProgress(updated));
    try {
      await toggleChecklistItem(itemId, currentStatus);
    } catch {
      // Revert on failure
      setItems(items);
      setProgress(getChecklistProgress(items));
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem({ id: item.id, name: item.name });
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.name.trim()) return;
    // Check duplicate
    const isDuplicate = items.some(
      i => i.id !== editingItem.id &&
        i.name.toLowerCase() === editingItem.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate', 'An item with this name already exists.');
      return;
    }
    try {
      await updateChecklistItem(editingItem.id, editingItem.name.trim());
      setItems(items.map(i =>
        i.id === editingItem.id ? { ...i, name: editingItem.name.trim() } : i
      ));
      setEditingItem(null);
    } catch {
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  const handleCancelEdit = () => setEditingItem(null);

  const handleDeleteItem = async () => {
    try {
      await deleteChecklistItem(deleteModal.itemId);
      const updated = items.filter(i => i.id !== deleteModal.itemId);
      setItems(updated);
      setProgress(getChecklistProgress(updated));
      setDeleteModal({ visible: false, itemId: null });
    } catch {
      Alert.alert('Error', 'Failed to delete item.');
      setDeleteModal({ visible: false, itemId: null });
    }
  };

  const handleUncheckAll = () => {
    Alert.alert(
      'Uncheck All',
      'Reset all items to unpacked?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            const updated = items.map(i => ({ ...i, isChecked: false }));
            setItems(updated);
            setProgress(getChecklistProgress(updated));
            try {
              await Promise.all(
                items.filter(i => i.isChecked).map(i => toggleChecklistItem(i.id, true))
              );
            } catch {
              fetchData();
            }
          },
        },
      ]
    );
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const categoryInfo = event ? getCategoryInfo(event.category) : null;

  const renderItem = ({ item }) => {
    const isBeingEdited = editingItem?.id === item.id;

    return (
      <View style={styles.itemRow}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleToggle(item.id, item.isChecked)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={item.isChecked ? 'checkbox' : 'square-outline'}
            size={26}
            color={item.isChecked ? COLORS.primary : COLORS.border}
          />
        </TouchableOpacity>

        {/* Item name or edit input */}
        {isBeingEdited ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editingItem.name}
              onChangeText={(text) => setEditingItem({ ...editingItem, name: text })}
              autoFocus
              onSubmitEditing={handleSaveEdit}
              returnKeyType="done"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity style={styles.editAction} onPress={handleSaveEdit}>
              <Ionicons name="checkmark" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editAction} onPress={handleCancelEdit}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text
            style={[styles.itemName, item.isChecked && styles.itemChecked]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
        )}

        {/* Edit mode actions */}
        {editMode && !isBeingEdited && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.itemAction}
              onPress={() => handleStartEdit(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.itemAction}
              onPress={() => setDeleteModal({ visible: true, itemId: item.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── Empty state ──────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📝</Text>
      <Text style={styles.emptyTitle}>No items yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to start adding items to your checklist
      </Text>
    </View>
  );

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading checklist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Delete confirmation modal ── */}
      <Modal visible={deleteModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🗑️</Text>
            <Text style={styles.modalTitle}>Remove Item</Text>
            <Text style={styles.modalMessage}>
              Remove this item from your checklist?
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleDeleteItem}>
              <Text style={styles.modalButtonText}>Yes, Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={() => setDeleteModal({ visible: false, itemId: null })}
            >
              <Text style={styles.modalButtonOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {items.length > 0 && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleUncheckAll}
            >
              <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              editMode && styles.headerActionBtnActive,
            ]}
            onPress={() => {
              setEditMode(!editMode);
              setEditingItem(null);
            }}
          >
            <Text style={[
              styles.editToggleText,
              editMode && styles.editToggleTextActive,
            ]}>
              {editMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Event card ── */}
      {event && categoryInfo && (
        <View style={[styles.eventCard, { backgroundColor: categoryInfo.color }]}>
          <View style={styles.eventCardLeft}>
            <Text style={styles.eventCardIcon}>{event.emoji || categoryInfo.icon}</Text>
            <View style={styles.eventCardInfo}>
              <Text style={styles.eventCardName} numberOfLines={1}>
                {event.name}
              </Text>
              {event.date ? (
                <Text style={styles.eventCardDate}>{formatDate(event.date)}</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.editEventBtn}
            onPress={() => navigation.navigate('CreateEvent', { event })}
          >
            <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Progress section ── */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {progress.checked} / {progress.total} items packed
          </Text>
          <Text style={[
            styles.progressPercent,
            progress.percentage === 100 && styles.progressPercentDone,
          ]}>
            {progress.percentage === 100 ? '✅ All done!' : `${progress.percentage}%`}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress.percentage}%` },
              progress.percentage === 100 && styles.progressBarFillDone,
            ]}
          />
        </View>

        {/* Checklist label + item count */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>Checklist</Text>
          <Text style={styles.listHeaderCount}>{items.length} items</Text>
        </View>
      </View>

      {/* ── Items list ── */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Floating + button ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('AddItems', {
            eventId,
            eventName: event?.name || eventName,
            category: event?.category,
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerActionBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  editToggleTextActive: {
    color: COLORS.white,
  },

  // ── Event card ──
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  eventCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  eventCardIcon: {
    fontSize: 32,
  },
  eventCardInfo: {
    flex: 1,
  },
  eventCardName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  eventCardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  editEventBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // ── Progress ──
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressPercentDone: {
    color: COLORS.success,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressBarFillDone: {
    backgroundColor: COLORS.success,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listHeaderCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },

  // ── Item row ──
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
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
    lineHeight: 20,
  },
  itemChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 4,
  },
  itemAction: {
    padding: 6,
    borderRadius: 8,
  },

  // ── Inline edit ──
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    outline: 'none',
  },
  editAction: {
    padding: 4,
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  // ── Delete modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  modalIcon: {
    fontSize: 44,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonOutlineText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
});