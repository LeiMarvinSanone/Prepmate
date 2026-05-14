// services/reminderService.js
// Handles all reminder operations:
//   - Scheduling local push notifications via expo-notifications
//   - Storing reminder records in Firestore so they persist across sessions
//   - Cancelling notifications when a reminder is toggled off or deleted

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, where,
  orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Firestore collection name ────────────────────────────────────────────────
const REMINDERS_COLLECTION = 'reminders';

// ─── Notification behaviour (what happens when a notification arrives) ────────
// This must be set at module level before any notification is scheduled.
// 'badge'  → shows the red number badge on the app icon
// 'sound'  → plays the default notification sound
// 'alert'  → shows the notification banner / heads-up display
// ─── Request notification permission ─────────────────────────────────────────
// Returns true if permission was granted, false otherwise.
// On web, expo-notifications is not fully supported — we skip gracefully.
export const requestNotificationPermission = async () => {
  // Expo push notifications only work on physical devices, not simulators.
  // On web we return true so the UI doesn't block — notifications just won't fire.
  if (Platform.OS === 'web') return true;

  if (!Device.isDevice) {
    // Running on a simulator/emulator — notifications won't work but we allow
    // the UI to proceed so you can still test the Firestore parts.
    console.warn('Notifications only work on physical devices.');
    return true;
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') return true;

  // Ask the user for permission
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// ─── Schedule a local notification ───────────────────────────────────────────
// Returns the Expo notification identifier string, which we store in Firestore
// so we can cancel the notification later if the reminder is toggled off.
//
// scheduledTime — a JavaScript Date object for when to fire the notification
// eventName     — shown as the notification title
// returns       — the notificationId string from Expo
export const scheduleNotification = async (scheduledTime, eventName) => {
  // On web expo-notifications scheduling is not supported — return a dummy id
  if (Platform.OS === 'web') return `web-${Date.now()}`;

  if (!(scheduledTime instanceof Date) || Number.isNaN(scheduledTime.getTime())) {
    throw new Error('Invalid scheduled time.');
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      // Notification title shown in the system tray
      title: `⏰ Reminder: ${eventName}`,
      // Notification body text
      body: "Don't forget to check your PrepMate checklist!",
      // Extra data passed to the app when notification is tapped
      data: { eventName },
      sound: true,
    },
    trigger: {
      date: scheduledTime,
    },
  });

  if (!notificationId) {
    throw new Error('Notification scheduling returned no id.');
  }

  return notificationId;
};

// ─── Cancel a scheduled notification ─────────────────────────────────────────
// Called when the user toggles a reminder OFF or deletes it.
export const cancelNotification = async (notificationId) => {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    // Notification may have already fired — safe to ignore
    console.warn('Cancel notification warning:', err);
  }
};

// ─── Firestore: create a new reminder ────────────────────────────────────────
// Stores the reminder metadata in Firestore so it reloads on app restart.
// Returns the new Firestore document id.
export const createReminder = async (userId, reminderData) => {
  const docRef = await addDoc(collection(db, REMINDERS_COLLECTION), {
    userId,
    ...reminderData,
    // isEnabled: true means the notification is currently scheduled
    isEnabled: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── Firestore: get all reminders for a user ──────────────────────────────────
// Returns newest reminders first (ordered by scheduledTime descending).
export const getUserReminders = async (userId) => {
  const q = query(
    collection(db, REMINDERS_COLLECTION),
    where('userId', '==', userId),
    orderBy('scheduledTime', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Firestore: toggle a reminder on/off ─────────────────────────────────────
// When toggling ON  → schedule a new notification, store the new notificationId
// When toggling OFF → cancel the existing notification, clear notificationId
export const toggleReminder = async (reminderId, currentlyEnabled, reminderData) => {
  const docRef = doc(db, REMINDERS_COLLECTION, reminderId);

  if (currentlyEnabled) {
    // Turning OFF — cancel the scheduled notification
    await cancelNotification(reminderData.notificationId);
    await updateDoc(docRef, {
      isEnabled:      false,
      notificationId: null,
    });
  } else {
    // Turning ON — re-schedule the notification for the same time
    const scheduledTime = new Date(reminderData.scheduledTime);

    // Only reschedule if the time is still in the future
    if (scheduledTime > new Date()) {
      const newNotificationId = await scheduleNotification(
        scheduledTime,
        reminderData.eventName
      );
      await updateDoc(docRef, {
        isEnabled:      true,
        notificationId: newNotificationId,
      });
    } else {
      // Time already passed — just mark enabled without scheduling
      await updateDoc(docRef, { isEnabled: true, notificationId: null });
    }
  }
};

// ─── Firestore: delete a reminder ────────────────────────────────────────────
export const deleteReminder = async (reminderId, notificationId) => {
  // Cancel the notification first so it doesn't fire after deletion
  await cancelNotification(notificationId);
  await deleteDoc(doc(db, REMINDERS_COLLECTION, reminderId));
};