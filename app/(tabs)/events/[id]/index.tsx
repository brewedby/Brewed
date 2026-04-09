import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvent, useDeleteEvent } from '@/lib/queries/events';
import { FinancialsCard } from '@/components/events/FinancialsCard';
import { StaffingList } from '@/components/events/StaffingList';
import { InfrastructureList } from '@/components/events/InfrastructureList';
import { EventStatusBadge } from '@/components/shared/EventStatusBadge';
import { ConfirmSheet } from '@/components/shared/ConfirmSheet';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDateRange, formatDate, formatCurrency } from '@/lib/formatters';
import { STATUS_COLORS, STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// Application journey — ordered steps
const STATUS_JOURNEY: { status: ApplicationStatus; label: string }[] = [
  { status: 'pending',   label: 'Applied' },
  { status: 'waitlisted', label: 'Waitlisted' },
  { status: 'accepted',  label: 'Accepted' },
];

function ApplicationTimeline({ currentStatus }: { currentStatus: ApplicationStatus }) {
  if (currentStatus === 'rejected' || currentStatus === 'withdrawn') {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
        <Text className="font-bold text-slate-700 mb-3">Application Journey</Text>
        <View className={`flex-row items-center px-4 py-3 rounded-xl ${STATUS_COLORS[currentStatus].bg}`}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLORS[currentStatus].dot, marginRight: 8 }} />
          <Text className={`font-semibold text-sm ${STATUS_COLORS[currentStatus].text}`}>
            Application {STATUS_LABELS[currentStatus]}
          </Text>
        </View>
      </View>
    );
  }

  const currentIdx = STATUS_JOURNEY.findIndex((s) => s.status === currentStatus);

  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
      <Text className="font-bold text-slate-700 mb-3">Application Journey</Text>
      <View className="flex-row items-center">
        {STATUS_JOURNEY.map((step, i) => {
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const isLast = i === STATUS_JOURNEY.length - 1;
          return (
            <React.Fragment key={step.status}>
              <View className="items-center">
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'}`}
                >
                  {done ? (
                    <Text className="text-white font-bold text-sm">{isCurrent ? '●' : '✓'}</Text>
                  ) : (
                    <Text className="text-slate-300 text-xs">{i + 1}</Text>
                  )}
                </View>
                <Text className={`text-xs mt-1 font-medium ${isCurrent ? 'text-emerald-600' : done ? 'text-slate-600' : 'text-slate-300'}`}>
                  {step.label}
                </Text>
              </View>
              {!isLast && (
                <View className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: event, isLoading, refetch } = useEvent(id);
  const deleteEvent = useDeleteEvent();
  const [refreshing, setRefreshing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(id);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleStatusChange(newStatus: ApplicationStatus) {
    setUpdatingStatus(true);
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', id);
    if (!error) {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
    setUpdatingStatus(false);
  }

  async function handleAcknowledgeChange() {
    await supabase.from('events').update({ url_changed: false }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['events', id] });
  }

  if (isLoading) return <LoadingSpinner message="Loading application..." />;
  if (!event) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-slate-500">Event not found</Text>
    </View>
  );

  const dotColor = STATUS_COLORS[event.status]?.dot ?? '#94a3b8';

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100">
        <View style={{ height: 4, backgroundColor: dotColor }} />
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Text className="text-amber-500 font-semibold text-sm">‹ Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/events/${id}/edit`)}
              className="bg-slate-900 px-4 py-1.5 rounded-xl"
            >
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold text-slate-900 mb-2 leading-snug">{event.name}</Text>

          <View className="flex-row items-center flex-wrap gap-2 mb-1">
            <EventStatusBadge status={event.status} />
            <Text className="text-slate-500 text-sm">📅 {formatDateRange(event.date, event.end_date)}</Text>
          </View>
          <Text className="text-slate-500 text-sm">📍 {event.location}</Text>
          {event.concessions_companies && (
            <Text className="text-slate-400 text-xs mt-0.5">🏢 {event.concessions_companies.name}</Text>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />}
      >
        {/* URL change alert */}
        {(event as any).url_changed && (
          <View className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-bold text-orange-800 text-sm mb-1">⚡ Application page changed!</Text>
                <Text className="text-orange-700 text-xs leading-relaxed">
                  The application page was updated since your last check. It might show your acceptance or rejection decision.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAcknowledgeChange}
                className="bg-orange-100 px-2.5 py-1 rounded-lg"
              >
                <Text className="text-orange-700 text-xs font-semibold">Dismiss</Text>
              </TouchableOpacity>
            </View>
            {(event as any).application_url && (
              <TouchableOpacity
                onPress={() => Linking.openURL((event as any).application_url)}
                className="mt-3 bg-orange-500 py-2.5 rounded-xl items-center"
              >
                <Text className="text-white font-semibold text-sm">Open Application Page ↗</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Application journey */}
        <ApplicationTimeline currentStatus={event.status} />

        {/* Quick status update */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
          <Text className="font-bold text-slate-700 mb-3">Update Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUSES.map((s) => {
              const colors = STATUS_COLORS[s];
              const active = event.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => !active && handleStatusChange(s)}
                  disabled={updatingStatus || active}
                  className={`flex-row items-center px-3 py-2 rounded-xl border ${active ? colors.bg + ' border-transparent' : 'bg-white border-slate-200'}`}
                >
                  <View style={{ backgroundColor: colors.dot, width: 7, height: 7, borderRadius: 4 }} className="mr-1.5" />
                  <Text className={`text-xs font-medium ${active ? colors.text : 'text-slate-600'}`}>{STATUS_LABELS[s]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Application URL quick access */}
        {(event as any).application_url && (
          <TouchableOpacity
            onPress={() => Linking.openURL((event as any).application_url)}
            className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-2xl mr-3">🔗</Text>
            <View className="flex-1">
              <Text className="font-semibold text-slate-800 text-sm">Application Portal</Text>
              <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                {(event as any).application_url}
              </Text>
            </View>
            <Text className="text-amber-500 font-semibold text-sm">Open ↗</Text>
          </TouchableOpacity>
        )}

        {/* Financials */}
        {event.event_financials && (
          <View className="mb-4">
            <FinancialsCard financials={event.event_financials} calculations={event.calculations} />
          </View>
        )}

        {/* Staffing */}
        {event.staffing_entries?.length > 0 && (
          <View className="mb-4">
            <StaffingList entries={event.staffing_entries} />
          </View>
        )}

        {/* Infrastructure */}
        {event.infrastructure_items?.length > 0 && (
          <View className="mb-4">
            <InfrastructureList items={event.infrastructure_items} />
          </View>
        )}

        {/* Details */}
        {(event.description || event.notes || event.application_date) && (
          <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 gap-3">
            <Text className="font-bold text-slate-700">Details</Text>
            {event.application_date && (
              <View className="flex-row">
                <Text className="text-slate-400 text-sm w-28">Applied on</Text>
                <Text className="text-slate-700 text-sm font-medium">{formatDate(event.application_date)}</Text>
              </View>
            )}
            {(event as any).url_last_checked_at && (
              <View className="flex-row">
                <Text className="text-slate-400 text-sm w-28">Last checked</Text>
                <Text className="text-slate-700 text-sm">{formatDate((event as any).url_last_checked_at)}</Text>
              </View>
            )}
            {event.description && (
              <Text className="text-slate-600 text-sm leading-relaxed">{event.description}</Text>
            )}
            {event.notes && (
              <>
                <View className="border-t border-slate-50" />
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Notes</Text>
                <Text className="text-slate-600 text-sm leading-relaxed">{event.notes}</Text>
              </>
            )}
          </View>
        )}

        {/* Danger zone */}
        <View className="bg-white rounded-2xl p-4 border border-red-100 mb-6">
          <TouchableOpacity
            onPress={() => setShowDelete(true)}
            className="border border-red-200 py-3 rounded-xl items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Delete Application</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <ConfirmSheet
        visible={showDelete}
        title="Delete Application"
        message={`Remove "${event.name}" from your tracker? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}
