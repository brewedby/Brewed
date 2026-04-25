import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={handleClose}>
        <Pressable>
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
            <View className="w-12 h-1 bg-stone-300 rounded-full self-center mb-5" />

            <Text className="text-xl font-bold text-stone-900 mb-1">Log Today's Sales</Text>
            <Text className="text-stone-400 text-sm mb-5">
              Pick an event and enter your gross takings
            </Text>

            <Text className="text-stone-600 text-sm font-medium mb-2">Event</Text>
            {isLoading ? (
              <ActivityIndicator color="#b45309" />
            ) : !events || events.length === 0 ? (
              <View className="bg-stone-50 rounded-xl p-4 mb-4">
                <Text className="text-stone-400 text-sm text-center">
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
                      className={`flex-row items-center px-3 py-3 rounded-xl mb-1.5 ${
                        isSelected
                          ? 'bg-amber-50 border border-amber-300'
                          : 'bg-stone-50 border border-stone-100'
                      }`}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color="#b45309" style={{ marginRight: 8 }} />
                      )}
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-medium ${isSelected ? 'text-amber-800' : 'text-stone-800'}`}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text className="text-stone-400 text-xs mt-0.5">
                          {formatDateRange(item.date, item.end_date)}
                          {item.location ? ` · ${item.location}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View className="mb-6">
              <CurrencyInput
                label="Gross Sales"
                value={grossSales}
                onChangeValue={setGrossSales}
                placeholder="0.00"
              />
            </View>

            <View className="gap-3">
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="bg-amber-700 py-4 rounded-xl items-center"
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                className="bg-stone-100 py-4 rounded-xl items-center"
              >
                <Text className="text-stone-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
