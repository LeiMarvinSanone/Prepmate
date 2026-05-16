// screens/RemindersScreen.js
//
// This screen lets users:
//   1. View all their reminders split into Upcoming and Completed (past) tabs
//   2. Add a new reminder by picking an event + date/time
//   3. Toggle reminders on/off (cancels/reschedules the notification)
//   4. Delete reminders with a confirmation modal
//
// Notifications are powered by expo-notifications (already installed).
// Reminder data is stored in Firestore so it persists across app restarts.

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, SafeAreaView,
  Modal, Switch, Alert, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Firebase auth — so we know which user's reminders to load
import { auth } from '../firebase';

// Theme hook — gives us colors that swap between light and dark mode
import { useTheme } from '../context/ThemeContext';

// Reminder operations (Firestore + expo-notifications)
import {
  getUserReminders,
  createReminder,
  toggleReminder,
  deleteReminder,
  scheduleNotification,
  requestNotificationPermission,
} from '../services/reminderService';

// Event service — so the "Add Reminder" modal can show a list of the user's events
import { getUserEvents } from '../services/eventService';

// ─── Component ────────────────────────────────────────────────────────────────

export default function RemindersScreen({ navigation }) {
  // Pull colors and isDark from ThemeContext
  // COLORS automatically switches between lightColors and darkColors
  const { colors: COLORS } = useTheme();

  // Build styles using the current theme colors
  // This is called on every render so styles always reflect the current mode
  const styles = makeStyles(COLORS);

  // ── State ────────────────────────────────────────────────────────────────

  const [reminders,     setReminders]     = useState([]);
  const [events,        setEvents]        = useState([]); // user's events for the picker
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('upcoming'); // 'upcoming' | 'past'

  // Add reminder modal visibility
  const [addModal,      setAddModal]      = useState(false);

  // Currently selected event in the add-modal picker
  const [selectedEvent, setSelectedEvent] = useState(null);

  // The date/time the user picked for the reminder
  const [reminderDate,  setReminderDate]  = useState(new Date());

  // Native date picker visibility (Android/iOS only — web uses <input type="datetime-local">)
  const [showPicker,    setShowPicker]    = useState(false);

  // Whether the "Add" button is in a loading state
  const [saving,        setSaving]        = useState(false);

  // Inline feedback shown in the modal so failures are visible even if alerts are dismissed
  const [addReminderMessage, setAddReminderMessage] = useState(null);

  // Delete confirmation modal
  const [deleteModal,   setDeleteModal]   = useState({ visible: false, reminderId: null, notificationId: null });

  // ── Fetch reminders every time screen is focused ──────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Fetch reminders and the user's events in parallel for speed
      const [fetchedReminders, fetchedEvents] = await Promise.all([
        getUserReminders(user.uid),
        getUserEvents(user.uid),
      ]);

      setReminders(fetchedReminders);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error loading reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Split reminders into upcoming (future) and past ───────────────────────
  // "Upcoming" = scheduledTime is in the future
  // "Past"     = scheduledTime is in the past (already fired or missed)

  const now = new Date();

  const upcomingReminders = reminders.filter(
    (r) => new Date(r.scheduledTime) > now
  );

  const pastReminders = reminders.filter(
    (r) => new Date(r.scheduledTime) <= now
  );

  const displayedReminders = activeTab === 'upcoming' ? upcomingReminders : pastReminders;

  // ── Toggle a reminder on/off ──────────────────────────────────────────────

  const handleToggle = async (reminder) => {
    try {
      await toggleReminder(reminder.id, reminder.isEnabled, {
        scheduledTime:  reminder.scheduledTime,
        eventName:      reminder.eventName,
        notificationId: reminder.notificationId,
      });
      // Reload so the UI reflects the new state
      loadReminders();
    } catch (err) {
      console.error('Toggle error:', err);
      Alert.alert('Error', 'Could not update reminder.');
    }
  };

  // ── Delete a reminder ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    try {
      await deleteReminder(deleteModal.reminderId, deleteModal.notificationId);
      setDeleteModal({ visible: false, reminderId: null, notificationId: null });
      loadReminders();
    } catch (err) {
      console.error('Delete error:', err);
      Alert.alert('Error', 'Could not delete reminder.');
    }
  };

  // ── Add a new reminder ────────────────────────────────────────────────────

  const handleAddReminder = async () => {
    console.log('Add Reminder button pressed');
    console.log('Selected event:', selectedEvent);
    console.log('Selected date:', reminderDate);

    try {
      if (!selectedEvent) {
        const message = 'Please select an event.';
        setAddReminderMessage({ type: 'error', text: message });
        Alert.alert('Please select an event', message);
        return;
      }

      if (!(reminderDate instanceof Date) || Number.isNaN(reminderDate.getTime())) {
        const message = 'Please select a valid date and time.';
        setAddReminderMessage({ type: 'error', text: message });
        Alert.alert('Invalid date', message);
        return;
      }

      if (reminderDate <= new Date()) {
        const message = 'Please choose a future time.';
        setAddReminderMessage({ type: 'error', text: message });
        Alert.alert('Please choose a future time', message);
        return;
      }

      setSaving(true);
      setAddReminderMessage(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be signed in to create reminders.');
      }

      // 1. Request notification permission (asks the user if not yet granted)
      const hasPermission = await requestNotificationPermission();
      const permissionStatus = hasPermission ? 'granted' : 'denied';
      console.log('Permission status:', permissionStatus);

      if (!hasPermission) {
        throw new Error('Notification permission required.');
      }

      // 2. Schedule the local notification (returns an Expo notification ID)
      const eventName = selectedEvent.name || selectedEvent.title || 'Reminder';
      const notificationId = await scheduleNotification(reminderDate, eventName);
      console.log('Notification scheduled:', notificationId);

      if (!notificationId) {
        throw new Error('Failed to schedule notification.');
      }

      // 3. Save reminder to Firestore (so it reloads on app restart)
      console.log('Saving reminder to Firestore...');
      const reminderId = await createReminder(user.uid, {
        eventId:        selectedEvent.id,
        eventName,
        eventEmoji:     selectedEvent.emoji || selectedEvent.icon || '📋',
        // Store as ISO string so Firestore comparisons work correctly
        scheduledTime:  reminderDate.toISOString(),
        notificationId, // stored so we can cancel it later
        isEnabled:      true,
      });
      console.log('Reminder saved successfully');

      setReminders((current) => [
        {
          id: reminderId,
          userId: user.uid,
          eventId: selectedEvent.id,
          eventName,
          eventEmoji: selectedEvent.emoji || selectedEvent.icon || '📋',
          scheduledTime: reminderDate.toISOString(),
          notificationId,
          isEnabled: true,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);

      // 4. Reset modal state and reload
      setAddReminderMessage({ type: 'success', text: 'Reminder created successfully.' });
      setAddModal(false);
      setSelectedEvent(null);
      setReminderDate(new Date());
      setShowPicker(false);
      loadReminders();

      Alert.alert('Reminder created', `You'll be reminded for "${eventName}".`);
    } catch (err) {
      console.error('Create reminder failed:', err);
      const message = err?.message || 'Failed to create reminder';
      setAddReminderMessage({ type: 'error', text: message });
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    }) + ' · ' + d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const formatPickerDate = (d) =>
    d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    }) + ' · ' + d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  // ── Date/time helpers (timezone-safe) ─────────────────────────────────────
  //
  // ROOT CAUSE OF DISPLAY BUG:
  //   toISOString() always returns UTC. If the user is in UTC+8 and picks
  //   10:00 PM local time, toISOString() produces "14:00Z" — so the web
  //   <input value> shows 2:00 PM instead of 10:00 PM.
  //
  // FIX: toLocalDateTimeString() pads date parts using LOCAL time components
  // (getFullYear, getMonth, getDate, getHours, getMinutes) — no UTC conversion.

  const toLocalDateTimeString = (d) => {
    // Build yyyy-MM-ddTHH:mm using LOCAL time fields, not UTC fields
    const year   = d.getFullYear();
    const month  = String(d.getMonth() + 1).padStart(2, '0'); // getMonth is 0-based
    const day    = String(d.getDate()).padStart(2, '0');
    const hours  = String(d.getHours()).padStart(2, '0');
    const mins   = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  // Minimum datetime-local value for the web <input> — 1 minute from now, in LOCAL time
  const getMinDateTimeLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    return toLocalDateTimeString(d); // use local, not toISOString (which is UTC)
  };

  // Parse a datetime-local string ("2025-06-01T22:00") into a local Date object.
  // new Date("2025-06-01T22:00") is ambiguous — some browsers treat it as UTC.
  // Splitting and using Date constructor with numeric args is always local time.
  const parseDateTimeLocal = (value) => {
    const [datePart, timePart] = value.split('T');
    const [year, month, day]   = datePart.split('-').map(Number);
    const [hours, minutes]     = timePart.split(':').map(Number);
    // Date(year, monthIndex, day, hours, minutes) — always local time
    return new Date(year, month - 1, day, hours, minutes);
  };

  // ── Render a single reminder card ─────────────────────────────────────────

  const renderReminder = ({ item }) => {
    const isPast    = new Date(item.scheduledTime) <= now;
    const isEnabled = item.isEnabled && !isPast;

    // Status pill color and text
    let pillBg, pillColor, pillText;
    if (isPast) {
      pillBg    = COLORS.border;
      pillColor = COLORS.textSecondary;
      pillText  = 'Completed';
    } else if (isEnabled) {
      pillBg    = COLORS.primaryLight;
      pillColor = COLORS.primary;
      pillText  = 'Active';
    } else {
      pillBg    = '#FFF3E0';
      // This amber color is hardcoded because it doesn't exist in the theme.
      // It's only used for the "Paused" status pill — visible in both modes.
      pillColor = '#E65100';
      pillText  = 'Paused';
    }

    return (
      <View style={styles.card}>
        {/* Left: event emoji circle */}
        <View style={styles.cardIconCircle}>
          <Text style={styles.cardIconEmoji}>{item.eventEmoji || '📋'}</Text>
        </View>

        {/* Middle: event name, date, status */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.eventName}</Text>
          <Text style={styles.cardDate}>{formatDateTime(item.scheduledTime)}</Text>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <Text style={[styles.statusText, { color: pillColor }]}>{pillText}</Text>
          </View>
        </View>

        {/* Right: toggle switch + delete button */}
        <View style={styles.cardRight}>
          {/* Only show toggle for upcoming reminders */}
          {!isPast && (
            <Switch
              value={isEnabled}
              onValueChange={() => handleToggle(item)}
              // Theme-aware switch colors
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          )}
          {/* Delete button — always visible */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeleteModal({
              visible:        true,
              reminderId:     item.id,
              notificationId: item.notificationId,
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* Error color for delete icon — theme-aware (#D32F2F / #EF9A9A) */}
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Delete confirmation modal ── */}
      <Modal visible={deleteModal.visible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmIcon}>🗑️</Text>
            <Text style={styles.confirmTitle}>Delete Reminder</Text>
            <Text style={styles.confirmMessage}>
              This will cancel the notification and remove the reminder.
            </Text>
            <TouchableOpacity style={styles.confirmDelete} onPress={handleDelete}>
              <Text style={styles.confirmDeleteText}>Yes, Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancel}
              onPress={() => setDeleteModal({ visible: false, reminderId: null, notificationId: null })}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add Reminder bottom sheet modal ── */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Sheet handle (visual drag indicator) */}
            <View style={styles.sheetHandle} />

            <Text style={styles.modalTitle}>Add Reminder</Text>

            {addReminderMessage && (
              <View style={[
                styles.feedbackBanner,
                addReminderMessage.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
              ]}>
                <Text style={styles.feedbackText}>{addReminderMessage.text}</Text>
              </View>
            )}

            {/* Scrollable content so it works on small screens */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Event picker ── */}
              <Text style={styles.sectionLabel}>Choose Event</Text>
              {events.length === 0 ? (
                <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                  No events found. Create an event first.
                </Text>
              ) : (
                events.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventPickerRow,
                      selectedEvent?.id === event.id && styles.eventPickerRowSelected,
                    ]}
                    onPress={() => setSelectedEvent(event)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.eventPickerEmoji}>{event.emoji || '📋'}</Text>
                    <Text style={[
                      styles.eventPickerName,
                      selectedEvent?.id === event.id && styles.eventPickerNameSelected,
                    ]}>
                      {event.name}
                    </Text>
                    {selectedEvent?.id === event.id && (
                      // Checkmark shown on the selected event
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}

              {/* ── Date & time picker ── */}
              <Text style={styles.sectionLabel}>Date & Time</Text>

              {Platform.OS === 'web' ? (
                // Web: use a native HTML datetime-local input
                // React Native's DateTimePicker doesn't support web
                <View style={styles.dateRow}>
                  <Ionicons name="calendar" size={20} color={COLORS.textSecondary} />
                  <input
                    type="datetime-local"
                    min={getMinDateTimeLocal()}
                    value={toLocalDateTimeString(reminderDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setReminderDate(parseDateTimeLocal(e.target.value));
                      }
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      fontSize: 15,
                      // Theme-aware text color for the web input
                      color: COLORS.text,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                </View>
              ) : (
                // Native (Android / iOS): two-step picker — date first, then time.
                //
                // WHY TWO PICKERS INSTEAD OF mode="datetime":
                //   On Android, mode="datetime" fires onChange twice (date step,
                //   then time step). The old code called setShowPicker(false) on
                //   the FIRST fire, closing the picker before the time step appeared.
                //   Result: user had to tap twice to set date, and time was never
                //   updated — it kept the initial value.
                //
                //   The fix: use two separate pickers chained together.
                //   Step 1 (showPicker="date")  → user picks date → store it,
                //                                  immediately open time picker.
                //   Step 2 (showPicker="time")  → user picks time → merge with
                //                                  stored date → update state once.
                //   This gives exactly one reliable state update with the full
                //   date+time the user selected.
                <>
                  <TouchableOpacity
                    style={styles.dateRow}
                    onPress={() => setShowPicker('date')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.dateText}>{formatPickerDate(reminderDate)}</Text>
                    <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>

                  {/* Step 1: Date picker */}
                  {showPicker === 'date' && (
                    <DateTimePicker
                      value={reminderDate}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        // Dismiss on cancel (selectedDate is undefined)
                        if (!selectedDate) { setShowPicker(false); return; }
                        // Merge the chosen date into the current reminderDate,
                        // keeping the existing time fields intact
                        const merged = new Date(reminderDate);
                        merged.setFullYear(selectedDate.getFullYear());
                        merged.setMonth(selectedDate.getMonth());
                        merged.setDate(selectedDate.getDate());
                        setReminderDate(merged);       // update display immediately
                        setShowPicker('time');          // open time picker next
                      }}
                    />
                  )}

                  {/* Step 2: Time picker — opens automatically after date is chosen */}
                  {showPicker === 'time' && (
                    <DateTimePicker
                      value={reminderDate}
                      mode="time"
                      display="default"
                      onChange={(event, selectedTime) => {
                        setShowPicker(false);           // close after time is chosen
                        if (!selectedTime) return;      // user cancelled
                        // Merge chosen time into the date we already have
                        const merged = new Date(reminderDate);
                        merged.setHours(selectedTime.getHours());
                        merged.setMinutes(selectedTime.getMinutes());
                        merged.setSeconds(0);
                        setReminderDate(merged);        // final state update
                      }}
                    />
                  )}
                </>
              )}

              {/* Bottom spacer so content isn't hidden behind the keyboard */}
              <View style={{ height: 16 }} />

            </ScrollView>

            {/* ── Cancel / Add Reminder buttons ── */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnOutline}
                onPress={() => {
                  setAddModal(false);
                  setSelectedEvent(null);
                  setShowPicker(false);
                  setAddReminderMessage(null);
                  setReminderDate(new Date());
                }}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, saving && { opacity: 0.7 }]}
                onPress={handleAddReminder}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.modalBtnText}>Add Reminder</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Page header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders 🔔</Text>
        <Text style={styles.headerSubtitle}>
          {upcomingReminders.length} upcoming · {pastReminders.length} completed
        </Text>
      </View>

      {/* ── Upcoming / Past tab selector ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming ({upcomingReminders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Completed ({pastReminders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content: loading / empty / list ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : displayedReminders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>
            {activeTab === 'upcoming' ? '🔔' : '✅'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'upcoming' ? 'No upcoming reminders' : 'No completed reminders'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'upcoming'
              ? 'Tap + to set a reminder for any of your events'
              : 'Reminders that have passed will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedReminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB: open Add Reminder modal ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setAddReminderMessage(null);
          setAddModal(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// makeStyles is defined ABOVE the component so it's never in the temporal dead
// zone when the component calls it. See the pattern used across all screens.

const makeStyles = (COLORS) => StyleSheet.create({
  // ── Root container ──
  safeArea: {
    flex: 1,
    // Use theme background so dark mode works automatically
    backgroundColor: COLORS.background,
  },

  // ── Page header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    // COLORS.text is #1A1A1A in light mode, #F0F0F0 in dark mode
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    // COLORS.textSecondary is #757575 light / #9E9E9E dark
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Tab row (Upcoming / Past) ──
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    // Theme-aware card background
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  // Active tab gets the primary color fill
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    // Inactive tab text uses theme text color
    color: COLORS.textSecondary,
  },
  // Active tab text is always white so it's readable on the green background
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ── Reminder card ──
  card: {
    // Theme-aware card surface (white in light, #1E1E1E in dark)
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Left colored circle showing event emoji
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // Uses theme's light primary background — works in both modes
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconEmoji: { fontSize: 22 },
  cardBody:      { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    // Theme text color — visible in both light and dark
    color: COLORS.text,
    marginBottom: 3,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  // Status pill shown below the date
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Right side: switch + delete button stacked
  cardRight: {
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
  },

  // ── List content padding ──
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // space for FAB
  },

  // ── FAB (floating + button) ──
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
    // Shadow for depth (deprecated on web but harmless)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  // ── Centered loading / empty states ──
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIcon:     { fontSize: 52, marginBottom: 14 },
  emptyTitle:    { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  // ── Add Reminder modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // slides up from bottom
  },
  modalSheet: {
    // Theme-aware surface
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  feedbackBanner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
  },
  feedbackError: {
    borderColor: COLORS.error,
  },
  feedbackSuccess: {
    borderColor: COLORS.success,
  },
  feedbackText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },

  // ── Section label inside modal ──
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 16,
  },

  // ── Event picker rows inside modal ──
  eventPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    // Theme card background
    backgroundColor: COLORS.background,
    gap: 12,
  },
  // Highlighted when selected
  eventPickerRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  eventPickerEmoji: { fontSize: 20 },
  eventPickerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  eventPickerNameSelected: {
    // Selected event name uses primary color for emphasis
    color: COLORS.primary,
  },

  // ── Date/time picker row ──
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    // Theme text — readable in both modes
    color: COLORS.text,
  },

  // ── Modal action buttons ──
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  modalBtnOutline: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnOutlineText: { color: COLORS.text, fontWeight: '500', fontSize: 15 },
  modalBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  // ── Delete confirmation modal ──
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  confirmIcon:    { fontSize: 44 },
  confirmTitle:   { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  confirmMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  confirmDelete: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  confirmCancel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  confirmCancelText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
});