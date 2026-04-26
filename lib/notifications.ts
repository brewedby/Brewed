// expo-notifications is NOT supported in Expo Go SDK 53+.
// All functions are no-ops here. Push notifications will be re-enabled
// when building with EAS (development build or production).

export async function registerForPushNotifications(_userId: string): Promise<string | null> {
  return null;
}

export function addNotificationResponseListener(
  _handler: (response: unknown) => void,
): { remove: () => void } | null {
  return null;
}

export async function clearBadge(): Promise<void> {
  // no-op
}
