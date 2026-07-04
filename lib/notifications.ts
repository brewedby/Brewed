/**
 * Local notifications runtime for fleet reminders.
 *
 * expo-notifications is a native module that is NOT available in Expo Go
 * (SDK 53+). Everything here degrades to a safe no-op in Expo Go and only
 * does real work in EAS development/production builds — the same lazy
 * require() pattern the IAP module uses.
 *
 * Scheduling model:
 *  - rescheduleFleetReminders() is idempotent: it cancels every
 *    notification it previously scheduled (ids persisted in AsyncStorage)
 *    then schedules the fresh set from buildReminderSchedule().
 *  - Callers re-run it whenever units or prefs change and on fleet screen
 *    mount, so the schedule survives app restarts and stays in sync.
 *  - Content never includes financial data (see fleetReminders.ts).
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildReminderSchedule, DEFAULT_REMINDER_PREFS, MAX_SCHEDULED,
  type FleetReminder, type ReminderPrefs, type ReminderUnit,
} from './fleetReminders';

const PREFS_KEY = '@fleetReminderPrefs:v1';
const SCHEDULED_IDS_KEY = '@fleetReminderIds:v1';

// ── Lazy native module loading (Expo Go-safe) ────────────────────────────────

type NotificationsModule = {
  getPermissionsAsync: () => Promise<{ status: string; canAskAgain: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  scheduleNotificationAsync: (req: {
    content: { title: string; body: string; sound: boolean };
    trigger: { type: 'date'; date: Date } | { date: Date };
  }) => Promise<string>;
  cancelScheduledNotificationAsync: (id: string) => Promise<void>;
};

let cachedModule: NotificationsModule | null | undefined;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  // Expo Go can't run the native module — no-op there.
  if ((Constants as unknown as { appOwnership?: string }).appOwnership === 'expo'
    || Constants.executionEnvironment === 'storeClient') {
    cachedModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** True when local notifications can actually be scheduled on this build. */
export function isNotificationsAvailable(): boolean {
  return loadNotifications() !== null;
}

// ── Permission flow ──────────────────────────────────────────────────────────

export type PermissionResult = 'granted' | 'denied' | 'unavailable';

export async function requestNotificationPermission(): Promise<PermissionResult> {
  const mod = loadNotifications();
  if (!mod) return 'unavailable';
  try {
    const existing = await mod.getPermissionsAsync();
    if (existing.status === 'granted') return 'granted';
    const requested = await mod.requestPermissionsAsync();
    return requested.status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

// ── Reminder prefs (device-local — notifications are per-device) ─────────────

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReminderPrefs>;
    return {
      enabled: parsed.enabled ?? DEFAULT_REMINDER_PREFS.enabled,
      offsets: { ...DEFAULT_REMINDER_PREFS.offsets, ...(parsed.offsets ?? {}) },
    };
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Non-fatal — prefs revert to defaults next launch.
  }
}

// ── Scheduling ───────────────────────────────────────────────────────────────

export interface RescheduleResult {
  scheduled: number;
  cancelled: number;
  unavailable: boolean;
  permission: PermissionResult;
}

/**
 * Idempotently sync the device's scheduled notifications to the current
 * units + prefs. Safe to call often — cancels its own prior schedule first.
 *
 * Does NOT prompt for permission unless promptIfNeeded is set, so a
 * background sync never surprises the user with a system dialog.
 */
export async function rescheduleFleetReminders(
  units: ReminderUnit[],
  prefs: ReminderPrefs,
  opts: { promptIfNeeded?: boolean } = {},
): Promise<RescheduleResult> {
  const mod = loadNotifications();
  if (!mod) return { scheduled: 0, cancelled: 0, unavailable: true, permission: 'unavailable' };

  // 1. Cancel everything we scheduled before (idempotency).
  let cancelled = 0;
  try {
    const rawIds = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const oldIds: string[] = rawIds ? JSON.parse(rawIds) : [];
    for (const id of oldIds) {
      try { await mod.cancelScheduledNotificationAsync(id); cancelled++; } catch { /* already fired */ }
    }
  } catch {
    // Corrupt store — fall through and overwrite below.
  }

  // 2. Disabled → leave nothing scheduled.
  if (!prefs.enabled) {
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify([]));
    return { scheduled: 0, cancelled, unavailable: false, permission: 'granted' };
  }

  // 3. Permission.
  let permission: PermissionResult;
  if (opts.promptIfNeeded) {
    permission = await requestNotificationPermission();
  } else {
    try {
      const existing = await mod.getPermissionsAsync();
      permission = existing.status === 'granted' ? 'granted' : 'denied';
    } catch {
      permission = 'denied';
    }
  }
  if (permission !== 'granted') {
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify([]));
    return { scheduled: 0, cancelled, unavailable: false, permission };
  }

  // 4. Build and schedule (respect the iOS 64-pending cap with headroom).
  const schedule = buildReminderSchedule(units, prefs, new Date()).slice(0, MAX_SCHEDULED);
  const newIds: string[] = [];
  for (const reminder of schedule) {
    try {
      const id = await mod.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body, sound: true },
        trigger: { type: 'date', date: reminder.fireDate },
      });
      newIds.push(id);
    } catch {
      // One bad schedule shouldn't abort the rest.
    }
  }

  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(newIds));
  return { scheduled: newIds.length, cancelled, unavailable: false, permission };
}

/** Preview what would be scheduled — used by the UI to show "next reminder". */
export function previewSchedule(units: ReminderUnit[], prefs: ReminderPrefs): FleetReminder[] {
  return buildReminderSchedule(units, prefs, new Date()).slice(0, MAX_SCHEDULED);
}
