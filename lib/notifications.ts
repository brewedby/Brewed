import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);

  return token;
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): { remove: () => void } {
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return { remove: () => sub.remove() };
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// Schedule local alerts for MOT/tax/service expiries and missed sales.
// Called on app launch — cancels stale scheduled notifications then re-schedules.
export async function scheduleLocalAlerts(opts: {
  units: { name: string; mot_expiry: string | null; tax_expiry: string | null; service_due: string | null }[];
  pastEventsWithNoSales: { name: string; date: string }[];
}): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const today = new Date();

  for (const unit of opts.units) {
    for (const [label, dateStr] of [
      ['MOT', unit.mot_expiry],
      ['tax', unit.tax_expiry],
      ['service', unit.service_due],
    ] as [string, string | null][]) {
      if (!dateStr) continue;
      const expiry = new Date(dateStr);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
      if (daysLeft > 0 && daysLeft <= 30) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${unit.name} ${label} due soon`,
            body: `${label.charAt(0).toUpperCase() + label.slice(1)} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${expiry.toLocaleDateString('en-GB')}.`,
            sound: true,
          },
          trigger: null, // deliver immediately on next app open
        });
      }
    }
  }

  for (const event of opts.pastEventsWithNoSales) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Log your sales',
        body: `Don't forget to add your sales figures for "${event.name}".`,
        sound: true,
      },
      trigger: null,
    });
  }
}
