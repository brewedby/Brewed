import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { useFeature } from '@/lib/iap/SubscriptionContext';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import {
  isNotificationsAvailable, loadReminderPrefs, saveReminderPrefs,
  rescheduleFleetReminders, previewSchedule,
} from '@/lib/notifications';
import { DEFAULT_REMINDER_PREFS, type ReminderPrefs, type ReminderUnit } from '@/lib/fleetReminders';

interface Props {
  units: ReminderUnit[];
}

const OFFSET_OPTIONS: { key: keyof ReminderPrefs['offsets']; label: string }[] = [
  { key: 'd30', label: '30 days' },
  { key: 'd14', label: '14 days' },
  { key: 'd7',  label: '7 days'  },
  { key: 'd0',  label: 'Due day' },
];

/**
 * MOT / tax / service reminder controls, shown on the Fleet screen.
 * Pro feature. Local notifications only — nothing leaves the device.
 */
export function FleetRemindersCard({ units }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const reminders = useFeature('fleet_reminders');

  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadReminderPrefs().then((loaded) => {
      if (cancelled) return;
      setPrefs(loaded);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Keep the device schedule in sync whenever units or prefs change.
  // rescheduleFleetReminders is idempotent, so this is safe on every mount —
  // it's also what re-arms reminders after an app restart or a unit edit.
  useEffect(() => {
    if (!hydrated || !reminders.allowed) return;
    let cancelled = false;
    rescheduleFleetReminders(units, prefs).then((result) => {
      if (!cancelled) setScheduledCount(result.unavailable ? null : result.scheduled);
    });
    return () => { cancelled = true; };
  }, [hydrated, units, prefs, reminders.allowed]);

  const applyPrefs = useCallback(async (next: ReminderPrefs, promptIfNeeded: boolean) => {
    setPrefs(next);
    await saveReminderPrefs(next);
    const result = await rescheduleFleetReminders(units, next, { promptIfNeeded });
    setScheduledCount(result.unavailable ? null : result.scheduled);

    if (next.enabled && result.permission === 'denied') {
      Alert.alert(
        'Notifications are off',
        'Reminders are saved, but iOS notifications are disabled for Brewed. Turn them on in Settings to receive MOT, tax and service alerts.',
        [
          { text: 'Not now', style: 'cancel' },
          ...(Platform.OS === 'ios'
            ? [{ text: 'Open Settings', onPress: () => Linking.openURL('app-settings:') }]
            : []),
        ],
      );
    }
  }, [units]);

  if (!reminders.allowed) {
    return (
      <View style={{ marginBottom: 14 }}>
        <UpgradePrompt
          feature="fleet_reminders"
          description="Get notified before MOT, tax and servicing fall due — 30, 14 and 7 days ahead, and on the day."
          compact
        />
      </View>
    );
  }

  const unavailable = !isNotificationsAvailable();
  const nextReminder = prefs.enabled ? previewSchedule(units, prefs)[0] : undefined;

  return (
    <View style={{
      backgroundColor: p.surface, borderWidth: 1, borderColor: p.borderStrong,
      padding: 14, marginBottom: 14,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="notifications-outline" size={16} color={p.text} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1, color: p.text, textTransform: 'uppercase' }}>
            Reminders
          </Text>
          <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>
            MOT, tax & service alerts on this device
          </Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(enabled) => applyPrefs({ ...prefs, enabled }, enabled)}
          accessibilityLabel="Enable fleet reminders"
          disabled={!hydrated}
        />
      </View>

      {prefs.enabled && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {OFFSET_OPTIONS.map(({ key, label }) => {
              const on = prefs.offsets[key];
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => applyPrefs({ ...prefs, offsets: { ...prefs.offsets, [key]: !on } }, false)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Remind ${label} before due`}
                  style={{
                    borderWidth: 1, borderColor: on ? p.text : p.border,
                    backgroundColor: on ? p.text : 'transparent',
                    paddingHorizontal: 12, paddingVertical: 7, minHeight: 32,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: on ? p.bg : p.textMuted }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 10, fontStyle: 'italic' }}>
            {unavailable
              ? 'Reminders will activate in the installed app (not available in Expo Go preview).'
              : nextReminder
                ? `${scheduledCount ?? 0} reminder${(scheduledCount ?? 0) === 1 ? '' : 's'} scheduled · next: ${nextReminder.title.toLowerCase()} — ${nextReminder.body}`
                : 'No upcoming due dates to remind about. Add MOT, tax or service dates to your units.'}
          </Text>
        </>
      )}
    </View>
  );
}
