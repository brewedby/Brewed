import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// expo-notifications is NOT supported in Expo Go SDK 53+.
// Guard all calls so the app doesn't crash when running via Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

// Configure how notifications appear when the app is foregrounded.
// Skip in Expo Go to avoid crashing the root layout.
if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Silently ignore — not in a dev build
  }
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (isExpoGo) return null;
  if (!Device.isDevice) return null;

  try {
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Brewed by Boon',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f59e0b',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'brewedbyboon',
    });
    const token = tokenData.data;

    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    return token;
  } catch {
    return null;
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription | null {
  if (isExpoGo) return null;
  try {
    return Notifications.addNotificationResponseReceivedListener(handler);
  } catch {
    return null;
  }
}

export async function clearBadge() {
  if (isExpoGo) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Ignore
  }
}
