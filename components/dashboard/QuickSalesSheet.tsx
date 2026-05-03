import React, { useState } from 'react';
import {
  View, Text, Modal, Pressable, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';
import { useEvents } from '@/lib/queries/events';
import { useLogSales } from '@/lib/mutations/events';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatDateRange } from '@/lib/formatters';
import type { EventWithFinancials } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuickSalesSheet({ visible, onClose }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [selectedEvent, setSelectedEvent] = useState<EventWithFinancials | null>(null);
  const [grossSales, setGrossSales] = useState(0);

  const { data: events, isLoading } = useEvents({ status: 'accepted' });
  const { mutate: logSales, isPending: saving } = useLogSales();

  function handleClose() {
    setSelectedEvent(null);
    setGrossSales(0);
    onClose();
  }

  function handleSave() {
    if (!selectedEvent) {
      Alert.alert('Select an event', 'Please choose which event to log sales for.');
      return;
    }
    if (grossSales <= 0) {
      Alert.alert('Enter sales', 'Please enter a gross sales figure greater than zero.');
      return;
    }
    logSales(
      { eventId: selectedEvent.id, grossSales },
      {
        onSuccess: () => {
          Alert.alert('Saved', `Sales of £${grossSales.toFixed(2)} logged for ${selectedEvent.name}.`);
          handleClose();
        },
        onError: (err: Error) => Alert.alert('Error', err.message),
      }
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={handleClose}>
        <Pressable>
          <View style={{ backgroundColor: p.bg, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, borderTopWidth: 2, borderTopColor: p.text }}>
            <View style={{ width: 40, height: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 18 }} />

            <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text, marginBottom: 4 }}>Log Today's Sales</Text>
            <Text style={{ color: p.textFaint, fontSize: 13, marginBottom: 20 }}>
              Pick an event and enter your gross takings
            </Text>

            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Event</Text>
            {isLoading ? (
              <ActivityIndicator color={p.brand} />
            ) : !events || events.length === 0 ? (
              <View style={{ backgroundColor: p.surface, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: p.border }}>
                <Text style={{ color: p.textFaint, fontSize: 13, textAlign: 'center' }}>
                  No accepted events found
                </Text>
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(e) => e.id}
                style={{ maxHeight: 180, marginBottom: 16 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = selectedEvent?.id === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedEvent(item)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? p.brand : p.border,
                        backgroundColor: isSelected ? p.brandSoft : p.surface,
                      }}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <Text style={{ marginRight: 8, fontSize: 14, color: p.brand, fontWeight: '700' }}>✓</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: isSelected ? p.brandText : p.text }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={{ color: p.textFaint, fontSize: 11, marginTop: 2 }}>
                          {formatDateRange(item.date, item.end_date)}
                          {item.location ? ` · ${item.location}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={{ marginBottom: 22 }}>
              <CurrencyInput
                label="Gross Sales"
                value={grossSales}
                onChangeValue={setGrossSales}
                placeholder="0.00"
              />
            </View>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: p.text, paddingVertical: 16, alignItems: 'center' }}
              >
                {saving ? (
                  <ActivityIndicator color={p.bg} />
                ) : (
                  <Text style={{ color: p.bg, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>SAVE</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                style={{ borderWidth: 1, borderColor: p.border, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: p.textMuted, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
