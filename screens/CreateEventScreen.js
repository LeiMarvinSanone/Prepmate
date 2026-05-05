// screens/CreateEventScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  SafeAreaView, Modal, Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../firebase';
import { COLORS } from '../constants/colors';
import { CATEGORIES } from '../constants/categories';
import { createEvent, updateEvent } from '../services/eventService';

export default function CreateEventScreen({ navigation, route }) {
  const existingEvent = route.params?.event || null;
  const defaultCategory = route.params?.defaultCategory || 'outdoor';

  const [name, setName] = useState(existingEvent?.name || '');
  const [category, setCategory] = useState(existingEvent?.category || defaultCategory);
  const [date, setDate] = useState(
    existingEvent?.date ? new Date(existingEvent.date) : new Date()
  );
  const [time, setTime] = useState(
    existingEvent?.time ? new Date(`1970-01-01T${existingEvent.time}`) : new Date()
  );
  const [notes, setNotes] = useState(existingEvent?.notes || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState({ visible: false, eventId: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isEditing = !!existingEvent;

  const formatDisplayDate = (d) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDisplayTime = (t) => {
    return t.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatSaveDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
  const formatSaveTime = (t) => t.toTimeString().slice(0, 5);

  const validate = () => {
    let valid = true;
    let newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Event name is required';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const eventData = {
        name,
        category,
        date: formatSaveDate(date),
        time: formatSaveTime(time),
        notes,
      };
      if (isEditing) {
        await updateEvent(existingEvent.id, eventData);
        setModal({ visible: true, eventId: existingEvent.id, isEditing: true });
      } else {
        const eventId = await createEvent(user.uid, eventData);
        setModal({ visible: true, eventId, isEditing: false });
      }
    } catch (error) {
      setModal({ visible: true, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const selectableCategories = CATEGORIES.filter(c => c.id !== 'custom');

  const webInputStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    border: '1px solid #E0E0E0',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#F9F9F9',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 0,
  };

  const webNativeInputStyle = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 15,
    color: '#1A1A1A',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Success/Error Modal */}
      <Modal visible={modal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {modal.isError ? (
              <>
                <Text style={styles.modalIcon}>❌</Text>
                <Text style={styles.modalTitle}>Error</Text>
                <Text style={styles.modalMessage}>
                  Failed to save event. Please try again.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setModal({ visible: false })}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalIcon}>🎉</Text>
                <Text style={styles.modalTitle}>
                  {modal.isEditing ? 'Event Updated!' : 'Event Created!'}
                </Text>
                <Text style={styles.modalMessage}>
                  {modal.isEditing
                    ? 'Your event has been updated successfully.'
                    : 'What would you like to do next?'}
                </Text>
                {!modal.isEditing && (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setModal({ visible: false });
                      setTimeout(() => {
                        navigation.replace('AddItems', {
                          eventId: modal.eventId,
                          eventName: name,
                          category,
                        });
                      }, 100);
                    }}
                  >
                    <Text style={styles.modalButtonText}>➕ Add Items</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonOutline]}
                  onPress={() => {
                    setModal({ visible: false });
                    setTimeout(() => navigation.goBack(), 100);
                  }}
                >
                  <Text style={styles.modalButtonOutlineText}>
                    {modal.isEditing ? 'Go Back' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Native Date Picker (Android/iOS only) */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(e, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Native Time Picker (Android/iOS only) */}
      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={(e, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setTime(selectedTime);
          }}
        />
      )}

      {/* Scrollable Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Event Icon Preview */}
        <View style={styles.iconPreview}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>
              {CATEGORIES.find(c => c.id === category)?.icon || '📋'}
            </Text>
          </View>
          <Text style={styles.iconLabel}>
            {CATEGORIES.find(c => c.id === category)?.label || 'Event'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          {/* Event Name */}
          <Text style={styles.label}>Event Name</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="event"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. Beach Trip"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors({ ...errors, name: null });
              }}
              placeholderTextColor={COLORS.textSecondary}
            />
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
            {selectableCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      category === cat.id ? COLORS.primary : cat.color,
                  },
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryChipLabel,
                    category === cat.id && styles.categoryChipLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          {Platform.OS === 'web' ? (
            <label style={webInputStyle}>
              <Ionicons
                name="calendar"
                size={20}
                color={COLORS.textSecondary}
                style={{ marginRight: 10 }}
              />
              <input
                type="date"
                value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-');
                    const localDate = new Date(
                      parseInt(year),
                      parseInt(month) - 1,
                      parseInt(day)
                    );
                    setDate(localDate);
                  }
                }}
                style={webNativeInputStyle}
              />
            </label>
          ) : (
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <Text style={styles.pickerText}>{formatDisplayDate(date)}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Time */}
          <Text style={styles.label}>Time</Text>
          {Platform.OS === 'web' ? (
            <label style={webInputStyle}>
              <Ionicons
                name="time"
                size={20}
                color={COLORS.textSecondary}
                style={{ marginRight: 10 }}
              />
              <input
                type="time"
                value={`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [hours, minutes] = e.target.value.split(':');
                    const newTime = new Date();
                    newTime.setHours(parseInt(hours));
                    newTime.setMinutes(parseInt(minutes));
                    setTime(newTime);
                  }
                }}
                style={webNativeInputStyle}
              />
            </label>
          ) : (
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="time"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <Text style={styles.pickerText}>{formatDisplayTime(time)}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <View style={[styles.inputWrapper, styles.notesWrapper]}>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Add any notes here..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update Event' : 'Create Event'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
    display: 'flex',
    flexDirection: 'column',
  },
  container: {
    flexGrow: 1,
    paddingBottom: 120,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  iconPreview: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 36,
  },
  iconLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  form: {
    paddingHorizontal: 20,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  inputIcon: {
    marginRight: 10,
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
  },
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
  categoryChipIcon: {
    fontSize: 16,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryChipLabelSelected: {
    color: COLORS.white,
  },
  notesWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    width: '100%',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
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
    maxWidth: 380,
    gap: 12,
  },
  modalIcon: {
    fontSize: 48,
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
    backgroundColor: COLORS.primary,
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
  scrollView: {
  flex: 1,
  width: '100%',
},
});