// screens/CreateEventScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  SafeAreaView, Modal, Platform, FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES } from '../constants/categories';
import { createEvent, updateEvent } from '../services/eventService';

// ─── Emoji picker data ────────────────────────────────────────────────────────
// Grouped so the picker sheet feels organized and scannable
const EMOJI_GROUPS = [
  {
    label: 'Travel & Outdoor',
    emojis: ['🏖️','🏕️','🏔️','🌊','🌴','🎿','🚵','🧗','🤿','🛶','🌄','🌅','🏞️','🗺️','🧭'],
  },
  {
    label: 'Work & Formal',
    emojis: ['💼','👔','🤝','📊','🖥️','📋','🗂️','📝','🏛️','🎓','👗','💍','🥂','🎤','📸'],
  },
  {
    label: 'School & Study',
    emojis: ['📚','✏️','📐','🔬','🧪','💻','🖊️','📓','🗒️','🎒','📌','📎','🏫','🧠','📏'],
  },
  {
    label: 'Food & Celebration',
    emojis: ['🎂','🎉','🎊','🥳','🍕','🍣','🍜','🥗','🍷','🥂','🎁','🎈','🪅','🎆','🎇'],
  },
  {
    label: 'Sports & Fitness',
    emojis: ['⚽','🏀','🎾','🏋️','🧘','🚴','🏊','🤸','🏃','🥊','⛳','🎯','🏆','🥇','🎽'],
  },
  {
    label: 'Home & Lifestyle',
    emojis: ['🏠','🛋️','🌿','🎮','🎬','🎵','🎨','📷','🧹','🍳','☕','🛁','🛒','🐾','💐'],
  },
];


export default function CreateEventScreen({ navigation, route }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const existingEvent   = route.params?.event          || null;
  const defaultCategory = route.params?.defaultCategory || 'outdoor';

  // Determine if opened from ChecklistDetail (edit) or fresh creation
  const isEditing = !!existingEvent;

  // ── Form state ──
  const [name,     setName]     = useState(existingEvent?.name     || '');
  const [category, setCategory] = useState(existingEvent?.category || defaultCategory);
  const [notes,    setNotes]    = useState(existingEvent?.notes    || '');
  const [emoji,    setEmoji]    = useState(
    existingEvent?.emoji || CATEGORIES.find(c => c.id === (existingEvent?.category || defaultCategory))?.icon || '📋'
  );

  // Date – parse stored "YYYY-MM-DD" safely to avoid timezone shifts
  const parseSavedDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const [date, setDate] = useState(parseSavedDate(existingEvent?.date));
  const [time, setTime] = useState(
    existingEvent?.time ? new Date(`1970-01-01T${existingEvent.time}`) : new Date()
  );

  // ── UI state ──
  const [loading,        setLoading]        = useState(false);
  const [errors,         setErrors]         = useState({});
  const [resultModal,    setResultModal]    = useState({ visible: false });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [emojiModal,     setEmojiModal]     = useState(false);

  const scrollRef  = useRef(null);
  const isMounted  = useRef(true);

  // Mark unmounted so async callbacks never setState after navigation
  React.useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ─── Formatters ───────────────────────────────────────────────────────────

  const formatDisplayDate = (d) =>
    d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });

  const formatDisplayTime = (t) =>
    t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatSaveDate = (d) => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const formatSaveTime = (t) => t.toTimeString().slice(0, 5);

  // ─── Validation ───────────────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Event name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Save handler ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const eventData = {
        name:     name.trim(),
        category,
        emoji,
        date:     formatSaveDate(date),
        time:     formatSaveTime(time),
        notes:    notes.trim(),
      };

      if (isEditing) {
        // 1. Save to Firestore
        await updateEvent(existingEvent.id, eventData);
        // 2. Navigate directly — no modal for edits, avoids the
        //    setState-after-navigate race that caused "something went wrong"
        navigation.navigate('ChecklistDetail', {
          eventId:   existingEvent.id,
          eventName: name.trim(),
        });
      } else {
        // Capture eventId before any state mutation to avoid stale closure
        const newEventId = await createEvent(user.uid, eventData);
        if (isMounted.current) {
          setResultModal({
            visible:   true,
            success:   true,
            isEditing: false,
            eventId:   newEventId,
          });
        }
      }
    } catch (err) {
      console.error('Save event error:', err);
      if (isMounted.current) {
        setResultModal({ visible: true, success: false });
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // ─── Post-save navigation ─────────────────────────────────────────────────

  // Capture ALL needed values as locals BEFORE any setState call.
  // Reading component state (name, category) inside a setTimeout after
  // setResultModal() fires is the cause of the "something went wrong" error —
  // the re-render can make those refs stale by the time the callback runs.
  const handleGoAddItems = (savedEventId) => {
    const capturedName     = name.trim();   // snapshot now, before re-render
    const capturedCategory = category;      // snapshot now, before re-render
    setResultModal({ visible: false });
    navigation.replace('AddItems', {
      eventId:   savedEventId,
      eventName: capturedName,
      category:  capturedCategory,
    });
  };

  const handleAfterSave = () => {
    setResultModal({ visible: false });
    navigation.goBack();
  };

  // ─── Category change syncs default emoji ─────────────────────────────────

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    // Only auto-update emoji if user hasn't manually picked one
    // (i.e. current emoji still matches the old category's default)
    const oldDefault = CATEGORIES.find(c => c.id === category)?.icon;
    if (emoji === oldDefault) {
      setEmoji(CATEGORIES.find(c => c.id === catId)?.icon || '📋');
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selectableCategories = CATEGORIES.filter(c => c.id !== 'custom' && c.id !== 'more');
  const selectedCategoryInfo  = CATEGORIES.find(c => c.id === category);

  // ─── Web-only date/time input styles ─────────────────────────────────────

  const webRowStyle = {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    border: `1px solid ${COLORS.border}`, borderRadius: 12,
    paddingLeft: 12, paddingRight: 12, paddingTop: 12, paddingBottom: 12,
    backgroundColor: COLORS.background, cursor: 'pointer',
    width: '100%', boxSizing: 'border-box',
  };
  const webInputStyle = {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: 15, color: COLORS.text, outline: 'none',
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Result modal (success / error) ── */}
      <Modal visible={resultModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {!resultModal.success ? (
              <>
                <Text style={styles.modalEmoji}>❌</Text>
                <Text style={styles.modalTitle}>Something went wrong</Text>
                <Text style={styles.modalMsg}>
                  Could not save the event. Please try again.
                </Text>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => setResultModal({ visible: false })}
                >
                  <Text style={styles.modalBtnText}>OK</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalEmoji}>🎉</Text>
                <Text style={styles.modalTitle}>Event Created!</Text>
                <Text style={styles.modalMsg}>What would you like to do next?</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => handleGoAddItems(resultModal.eventId)}>
                  <Text style={styles.modalBtnText}>➕  Add Items Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnOutline]}
                  onPress={handleAfterSave}
                >
                  <Text style={styles.modalBtnOutlineText}>Done for Now</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Emoji picker modal ── */}
      <Modal visible={emojiModal} transparent animationType="slide">
        <View style={styles.emojiOverlay}>
          <View style={styles.emojiSheet}>
            {/* Sheet handle */}
            <View style={styles.sheetHandle} />
            <View style={styles.emojiSheetHeader}>
              <Text style={styles.emojiSheetTitle}>Choose an icon</Text>
              <TouchableOpacity onPress={() => setEmojiModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {EMOJI_GROUPS.map((group) => (
                <View key={group.label} style={styles.emojiGroup}>
                  <Text style={styles.emojiGroupLabel}>{group.label}</Text>
                  <View style={styles.emojiGrid}>
                    {group.emojis.map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[
                          styles.emojiCell,
                          emoji === e && styles.emojiCellSelected,
                        ]}
                        onPress={() => {
                          setEmoji(e);
                          setEmojiModal(false);
                        }}
                      >
                        <Text style={styles.emojiCellText}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Native date / time pickers ── */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}
      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={(_, selected) => {
            setShowTimePicker(false);
            if (selected) setTime(selected);
          }}
        />
      )}

      {/* ── Scrollable form ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </Text>
          {/* Ghost element to keep title centred */}
          <View style={{ width: 24 }} />
        </View>

        {/* ── Emoji / icon picker ── */}
        <View style={styles.iconSection}>
          <TouchableOpacity
            style={[
              styles.iconCircle,
              { backgroundColor: selectedCategoryInfo?.color || COLORS.primaryLight },
            ]}
            onPress={() => setEmojiModal(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.iconEmoji}>{emoji}</Text>
            <View style={styles.iconEditBadge}>
              <Ionicons name="pencil" size={10} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.iconHint}>Tap to change icon</Text>
        </View>

        {/* ── Form fields ── */}
        <View style={styles.form}>

          {/* Event name */}
          <Text style={styles.label}>Event Name</Text>
          <View style={[styles.inputRow, errors.name && styles.inputRowError]}>
            <MaterialIcons name="event" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Beach Trip"
              value={name}
              onChangeText={(t) => { setName(t); setErrors({ ...errors, name: null }); }}
              placeholderTextColor={COLORS.textSecondary}
              maxLength={60}
              returnKeyType="next"
            />
            {name.length > 0 && (
              <TouchableOpacity onPress={() => setName('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.border} />
              </TouchableOpacity>
            )}
          </View>
          {errors.name && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={COLORS.error} />
              <Text style={styles.errorText}>{errors.name}</Text>
            </View>
          )}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {selectableCategories.map((cat) => {
              const active = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: active ? COLORS.primary : cat.color },
                    active && styles.categoryChipActive,
                  ]}
                  onPress={() => handleCategoryChange(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          {Platform.OS === 'web' ? (
            <label style={webRowStyle}>
              <Ionicons name="calendar" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <input
                type="date"
                value={formatSaveDate(date)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setDate(new Date(y, m - 1, d));
                  }
                }}
                style={webInputStyle}
              />
            </label>
          ) : (
            <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Ionicons name="calendar" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <Text style={styles.pickerText}>{formatDisplayDate(date)}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Time */}
          <Text style={styles.label}>Time</Text>
          {Platform.OS === 'web' ? (
            <label style={webRowStyle}>
              <Ionicons name="time" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <input
                type="time"
                value={`${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [h, m] = e.target.value.split(':');
                    const t = new Date();
                    t.setHours(parseInt(h));
                    t.setMinutes(parseInt(m));
                    setTime(t);
                  }
                }}
                style={webInputStyle}
              />
            </label>
          ) : (
            <TouchableOpacity style={styles.inputRow} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
              <Ionicons name="time" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <Text style={styles.pickerText}>{formatDisplayTime(time)}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Notes */}
          <Text style={styles.label}>Notes <Text style={styles.labelOptional}>(optional)</Text></Text>
          <View style={[styles.inputRow, styles.notesRow]}>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Add any notes, reminders, or details…"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor={COLORS.textSecondary}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
          <Text style={styles.charCount}>{notes.length}/500</Text>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name={isEditing ? 'checkmark-circle' : 'add-circle'}
                  size={20}
                  color={COLORS.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Save Changes' : 'Create Event'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Discard / cancel link */}
          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelLinkText}>Discard & go back</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Styles ─────────────────────────────────────────────────────────────────

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // ── Icon / emoji section ──
  iconSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 38,
  },
  iconEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  iconHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // ── Form ──
  form: {
    paddingHorizontal: 20,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  labelOptional: {
    fontWeight: '400',
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  // ── Input rows ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  inputRowError: {
    borderColor: COLORS.error,
  },
  inputIcon: {
    // no extra style needed — gap handles spacing
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    outline: 'none',
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  notesRow: {
    alignItems: 'flex-start',
    paddingTop: 14,
    paddingBottom: 14,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },

  // ── Validation ──
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
  },

  // ── Category chips ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipActive: {
    // shadow for selected state
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipIcon: { fontSize: 16 },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryChipLabelActive: {
    color: COLORS.white,
  },

  // ── Save / cancel ──
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 24,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelLinkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },

  // ── Result modal ──
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
    maxWidth: 360,
    gap: 12,
  },
  modalEmoji: { fontSize: 52 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalMsg: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    width: '100%',
  },
  modalBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnOutlineText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Emoji picker modal ──
  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  emojiSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  emojiSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiSheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emojiGroup: {
    marginBottom: 20,
  },
  emojiGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emojiCellSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  emojiCellText: {
    fontSize: 24,
  },
});