import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventForm } from '@/components/events/EventForm';
import { useCreateEvent } from '@/lib/mutations/events';
import { useCompanies } from '@/lib/queries/companies';
import { useUnits } from '@/lib/queries/units';
import { useAuth } from '@/lib/auth';

export default function NewEventScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <Text className="text-lg font-bold text-stone-900">New Event</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-stone-500">Cancel</Text>
        </TouchableOpacity>
      </View>
      <EventForm
        companies={companies}
        units={units}
        onSubmit={async (data) => { await createEvent.mutateAsync({ data, userId: user!.id }); }}
        submitLabel="Create Event"
      />
    </View>
  );
}
