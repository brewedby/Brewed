import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function OfflineBanner() {
  return (
    <View style={{ backgroundColor: '#92400e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 16, gap: 6 }}>
      <Ionicons name="cloud-offline-outline" size={14} color="#fef3c7" />
      <Text style={{ color: '#fef3c7', fontSize: 12, fontWeight: '600' }}>
        No connection — showing cached data
      </Text>
    </View>
  );
}
