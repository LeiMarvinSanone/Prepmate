// screens/EventListScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator,
  SafeAreaView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { getUserEvents, deleteEvent } from '../services/eventService';
import { deleteAllEventItems, getChecklistItems, getChecklistProgress } from '../services/checklistService';
import { useModalFocus, clearAccessibilityFocus } from '../hooks/useModalFocus';

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventListScreen({ navigation, route }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);

  // allEvents holds every event fetched from Firestore (no filter applied).
  // filteredEvents is the derived list shown in the UI (category + search).
  const [allEvents,      setAllEvents]      = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search,         setSearch]         = useState('');
  const [loading,        setLoading]        = useState(true);
  const [deleteModal,    setDeleteModal]    = useState({ visible: false, eventId: null });

  // Hook to safely close delete modal while clearing focus to prevent aria-hidden warnings
  const closeDeleteModal = useModalFocus(deleteModal, setDeleteModal);

  // activeCategoryRef lets us read the current category synchronously inside
  // callbacks without stale-closure issues. It mirrors the route param.
  const activeCategoryRef = useRef(null);

  // ── Fetch ALL events from Firestore once, store unfiltered ────────────────

  const fetchAllEvents = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const fetched = await getUserEvents(user.uid);

      const withProgress = await Promise.all(
        fetched.map(async (event) => {
          try {
            const items = await getChecklistItems(event.id);
            return { ...event, progress: getChecklistProgress(items) };
          } catch {
            return { ...event, progress: { checked: 0, total: 0, percentage: 0 } };
          }
        })
      );

      setAllEvents(withProgress);
      // Apply whatever category is active right now
      applyFilter(withProgress, activeCategoryRef.current, search);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── applyFilter: derives filteredEvents from allEvents + category + search ─
  // Pure function — no side-effects other than calling setFilteredEvents.
  // This is the single source of truth for what the list shows.

  const applyFilter = (events, category, searchText) => {
    let result = events;

    // Step 1 — category filter
    // null / undefined category means "My Events" (show all)
    if (category && category.id) {
      result = result.filter(e => e.category === category.id);
    }

    // Step 2 — search filter on top of category filter
    if (searchText && searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }

    setFilteredEvents(result);
  };

  // ── useFocusEffect: runs whenever the screen is focused OR route params change.
  // We read the category directly from route.params here instead of from state
  // so we always get the freshest value from the navigator.

  useFocusEffect(
    useCallback(() => {
      // route.params?.category is set by HomeScreen when navigating from a tile,
      // and reset to null / undefined by the tab press listener in App.js.
      const category = route.params?.category ?? null;
      activeCategoryRef.current = category;
      setSearch('');
      fetchAllEvents();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.category])
  );

  // ── Search handler: filters the already-fetched allEvents list ─────────────

  const handleSearch = (text) => {
    setSearch(text);
    applyFilter(allEvents, activeCategoryRef.current, text);
  };

  // ── Delete handler ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await deleteAllEventItems(deleteModal.eventId);
      await deleteEvent(deleteModal.eventId);
      setDeleteModal({ visible: false, eventId: null });
      fetchAllEvents();
    } catch {
      setDeleteModal({ visible: false, eventId: null });
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getCategoryEmoji = (categoryId) => {
    const map = {
      outdoor: '🏔️', formal: '👔', travel: '🧳',
      school: '📖', indoor: '🛋️', more: '🗂️', custom: '✨',
    };
    return map[categoryId] || '📋';
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const currentCategory = route.params?.category ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('ChecklistDetail', {
        eventId: item.id, eventName: item.name,
      })}
      activeOpacity={0.8}
    >
      <View style={styles.eventLeft}>
        <Text style={styles.eventEmoji}>
          {item.emoji || getCategoryEmoji(item.category)}
        </Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>{item.name}</Text>
          <Text style={styles.eventDate}>{formatDate(item.date)}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.progress?.percentage || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {item.progress?.checked || 0}/{item.progress?.total || 0} items
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.eventActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateEvent', { event: item })}
        >
          <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setDeleteModal({ visible: true, eventId: item.id })}
        >
          <Ionicons name="trash" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Delete modal */}
      <Modal visible={deleteModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🗑️</Text>
            <Text style={styles.modalTitle}>Delete Event</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this event and all its items?
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => {
              clearAccessibilityFocus();
              handleDelete();
            }}>
              <Text style={styles.modalButtonText}>Yes, Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={closeDeleteModal}
            >
              <Text style={styles.modalButtonOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {currentCategory ? `${currentCategory.label} ${currentCategory.icon}` : 'My Events 📋'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentCategory
              ? `Your ${currentCategory.label.toLowerCase()} events`
              : 'All your events'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateEvent', {
            defaultCategory: currentCategory?.id,
          })}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor={COLORS.textSecondary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* List / empty / loading */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>
            {search ? 'No events found' : 'No events yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search
              ? 'Try a different search term'
              : currentCategory
                ? `No ${currentCategory.label.toLowerCase()} events yet`
                : 'Tap + to create your first event'}
          </Text>
          {!search && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateEvent', {
                defaultCategory: currentCategory?.id,
              })}
            >
              <Text style={styles.createButtonText}>Create Event</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
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
  modalIcon:    { fontSize: 48 },
  modalTitle:   { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  modalMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  modalButton: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText:        { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  modalButtonOutline:     { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  modalButtonOutlineText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
});