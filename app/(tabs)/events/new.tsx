import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventForm } from '@/components/events/EventForm';
import { useCreateEvent } from '@/lib/mutations/events';
import { useCompanies } from '@/lib/queries/companies';
import { useUnits } from '@/lib/queries/units';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';

export default function NewEventScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const createEvent = useCreateEvent();
  const { data: companies = [] } = useCompanies();
  const { data: units = [] } = useUnits();

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: p.text }}>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 24, letterSpacing: -0.5, color: p.text }}>New Event</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}>
          <Text style={{ fontSize: 13, color: p.brand, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <EventForm
        companies={companies}
        units={units}
        onSubmit={async (data) => {
          if (!user) { Alert.alert('Not signed in', 'Please sign in to create events.'); return; }
          await createEvent.mutateAsync({ data, userId: user.id });
          router.back();
        }}
        submitLabel="Create Event"
      />
    </View>
  );
}
