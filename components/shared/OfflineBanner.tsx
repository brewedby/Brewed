import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/lib/useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;

  return (
    <View
      style={{
        backgroundColor: '#1c1917',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={15} color="#fbbf24" />
      <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '500' }}>
        No connection — showing cached data
      </Text>
    </View>
  );
}
