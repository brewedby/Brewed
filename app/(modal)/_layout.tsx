import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="paywall" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
