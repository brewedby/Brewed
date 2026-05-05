import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvent, useDeleteEvent } from '@/lib/queries/events';
import { useCreateEvent } from '@/lib/mutations/events';
import { useAuth } from '@/lib/auth';
import { FinancialsCard } from '@/components/events/FinancialsCard';
import { WeatherCard } from '@/components/events/WeatherCard';
import { DailyTakingsCard } from '@/components/events/DailyTakingsCard';
import { PredictionInsightCard } from '@/components/events/PredictionInsightCard';
import { StaffingList } from '@/components/events/StaffingList';
import { InfrastructureList } from '@/components/events/InfrastructureList';
import { DocumentsSection } from '@/components/events/DocumentsSection';
import { CogsSection } from '@/components/cogs/CogsSection';
import { FarSectionRule } from '@/components/far/SectionRule';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useTheme } from '@/lib/themeContext';
import { BackBar } from '@/components/shared/BackBar';
import { pushTrail } from '@/lib/navTrail';
import { useProfile } from '@/lib/queries/profile';
import { farStatus, STATUS_DOT } from '@/lib/theme';
import { formatDateRange, formatDate, toISODateString } from '@/lib/formatters';
import { STATUSES, STATUS_LABELS } from '@/constants';
import type { ApplicationStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_JOURNEY: { status: ApplicationStatus; label: string }[] = [
  { status: 'pending',    label: 'Applied' },
  { status: 'waitlisted', label: 'Waitlisted' },
  { status: 'accepted',   label: 'Accepted' },
];

function ApplicationTimeline({ currentStatus }: { currentStatus: ApplicationStatus }) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const dotColor = STATUS_DOT[currentStatus] ?? p.textFaint;

  if (currentStatus === 'rejected' || currentStatus === 'withdrawn') {
    return (
      <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14, marginBottom: 16 }}>
        <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 10 }}>APPLICATION JOURNEY</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, backgroundColor: dotColor }} />
          <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text }}>
            Application {STATUS_LABELS[currentStatus]}
          </Text>
        </View>
      </View>
    );
  }

  const currentIdx = STATUS_JOURNEY.findIndex((s) => s.status === currentStatus);

  return (
    <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14, marginBottom: 16 }}>
      <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 14 }}>APPLICATION JOURNEY</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {STATUS_JOURNEY.map((step, i) => {
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const isLast = i === STATUS_JOURNEY.length - 1;
          return (
            <React.Fragment key={step.status}>
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 20, height: 20,
                  borderWidth: 1,
                  borderColor: done ? p.text : p.borderStrong,
                  backgroundColor: isCurrent ? p.text : done ? p.textMuted : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && !isCurrent && <Ionicons name="checkmark" size={11} color={p.bg} />}
                  {isCurrent && <View style={{ width: 8, height: 8, backgroundColor: p.bg }} />}
                </View>
                <Text style={{
                  fontSize: 9, marginTop: 5, fontWeight: '700', letterSpacing: 0.5,
                  color: isCurrent ? p.text : done ? p.textMuted : p.textFaint,
                }}>
                  {step.label.toUpperCase()}
                </Text>
              </View>
              {!isLast && (
                <View style={{
                  flex: 1, height: 1, marginTop: 10, marginHorizontal: 4,
                  backgroundColor: i < currentIdx ? p.textMuted : p.borderStrong,
                }} />
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
  const { id, companyName, trail } = useLocalSearchParams<{ id: string; companyName?: string; trail?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const S = farStatus(isDark);

  const { data: event, isLoading, refetch } = useEvent(id);
  const { data: profile } = useProfile(user?.id);
  const tradeType = profile?.business_type ?? null;
  const deleteEvent = useDeleteEvent();
  const createEvent = useCreateEvent();
  const [refreshing, setRefreshing] = useState(false);
  const [forecastTemp, setForecastTemp] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [justChanged, setJustChanged] = useState<ApplicationStatus | null>(null);
  const confirmScale = useRef(new Animated.Value(0)).current;

  function playConfirmAnimation(status: ApplicationStatus) {
    setJustChanged(status);
    confirmScale.setValue(0);
    Animated.sequence([
      Animated.spring(confirmScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(confirmScale, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setJustChanged(null));
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(id);
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete event');
    }
  }

  async function handleStatusChange(newStatus: ApplicationStatus) {
    setUpdatingStatus(true);
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', id);
    if (error) {
      Alert.alert('Error', 'Could not update status. Please try again.');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      playConfirmAnimation(newStatus);
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

  async function handleDuplicate() {
    if (!user || !event) return;
    setDuplicating(true);
    try {
      const newEvent = await createEvent.mutateAsync({
        userId: user.id,
        data: {
          name: `${event.name} (copy)`,
          date: toISODateString(new Date()),
          end_date: undefined,
          location: event.location,
          description: event.description ?? '',
          application_date: undefined,
          application_url: event.application_url ?? '',
          status: 'pending',
          notes: event.notes ?? '',
          company_id: event.company_id ?? '',
          unit_ids: event.units?.map((u) => u.id) ?? [],
          overnight_stay: event.overnight_stay,
          documents_uploaded: false,
          gross_sales: 0,
          zero_rated_sales: 0,
          standard_rated_sales: 0,
          concessions_commission_pct: event.event_financials?.concessions_commission_pct ?? 0,
          commission_basis: (event.event_financials?.commission_basis ?? 'net') === 'gross' ? 'gross' : 'net',
          pitch_fee_refund_pct: event.event_financials?.pitch_fee_refund_pct ?? 0,
          cost_of_goods: 0,
          pitch_fee: event.event_financials?.pitch_fee ?? 0,
          power_fee: event.event_financials?.power_fee ?? 0,
          travel_costs: event.event_financials?.travel_costs ?? 0,
          camping_costs: event.event_financials?.camping_costs ?? 0,
          equipment_costs: event.event_financials?.equipment_costs ?? 0,
          other_costs: event.event_financials?.other_costs ?? 0,
          staffing_costs: 0,
          fresh_milk_litres: 0,
          alt_milk_litres: 0,
          miles_driven: 0,
          staffing_entries: [],
          infrastructure_items: [],
        },
      });
      router.replace(`/(tabs)/events/${newEvent.id}/edit`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not duplicate event');
    } finally {
      setDuplicating(false);
    }
  }

  if (isLoading) return <LoadingSpinner message="Loading application..." />;
  if (!event) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
      <Text style={{ color: p.textMuted }}>Event not found</Text>
    </View>
  );

  const dotColor = STATUS_DOT[event.status] ?? p.textFaint;

  // Trail to pass forward (e.g. into edit modal). Falls back to the trail
  // we received unchanged when the event has no name yet.
  const childTrail = event
    ? pushTrail(trail, {
        label: event.name,
        pathname: '/(tabs)/events/[id]',
        params: { id, companyName: companyName ?? '', trail: trail ?? '' },
      })
    : trail ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      {/* ── Top nav — back label/target driven by the URL trail ── */}
      <BackBar
        trail={trail}
        fallbackLabel={companyName ?? 'Applications'}
        showCrumbs
        rightAction={
          <TouchableOpacity
            onPress={() => router.push({ pathname: `/(tabs)/events/${id}/edit`, params: { trail: childTrail } })}
            accessibilityRole="button"
            accessibilityLabel="Edit event"
            style={{ backgroundColor: p.text, paddingHorizontal: 14, paddingVertical: 6, minHeight: 36, justifyContent: 'center' }}
          >
            <Text style={{ color: p.bg, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>EDIT</Text>
          </TouchableOpacity>
        }
      />

      {/* ── Title block ── */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: p.text }}>
        <View style={{ borderWidth: 1, borderColor: dotColor, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: dotColor }}>
            {'● ' + event.status.toUpperCase()}
          </Text>
        </View>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 36, letterSpacing: -0.9, lineHeight: 38, color: p.text }}>
          {event.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, rowGap: 6, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="calendar-outline" size={12} color={p.textMuted} />
            <Text style={{ fontSize: 12, color: p.textMuted }}>{formatDateRange(event.date, event.end_date)}</Text>
          </View>
          <Text style={{ color: p.border, fontSize: 12 }}>·</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={12} color={p.textMuted} />
            <Text style={{ fontSize: 12, color: p.textMuted }}>{event.location}</Text>
          </View>
          {event.concessions_companies && (
            <>
              <Text style={{ color: p.border, fontSize: 12 }}>·</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="business-outline" size={12} color={p.textMuted} />
                <Text style={{ fontSize: 12, color: p.textMuted }}>{event.concessions_companies.name}</Text>
              </View>
            </>
          )}
          {event.units?.length > 0 && (
            <>
              <Text style={{ color: p.border, fontSize: 12 }}>·</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="car-outline" size={12} color={p.textMuted} />
                <Text style={{ fontSize: 12, color: p.textMuted }}>{event.units.map((u) => u.name).join(' · ')}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={p.brand} />}
        keyboardDismissMode="on-drag"
      >
        {/* ── URL change alert ── */}
        {event.url_changed && (
          <View style={{ borderWidth: 2, borderColor: S.amber, backgroundColor: S.amberBg, padding: 14, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: S.amber, marginBottom: 4 }}>⚡ APPLICATION PAGE CHANGED</Text>
                <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>
                  The application page was updated since your last check. It might show your acceptance or rejection decision.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAcknowledgeChange}
                accessibilityRole="button"
                accessibilityLabel="Dismiss page changed alert"
                style={{ borderWidth: 1, borderColor: S.amber, paddingHorizontal: 8, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: S.amber }}>DISMISS</Text>
              </TouchableOpacity>
            </View>
            {event.application_url && (
              <TouchableOpacity
                onPress={() => event.application_url && Linking.openURL(event.application_url)}
                style={{ marginTop: 10, borderWidth: 1, borderColor: S.amber, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: S.amber }}>OPEN APPLICATION PAGE ↗</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Post-event prompt ── */}
        {event.status === 'accepted' &&
          event.date < toISODateString(new Date()) &&
          (!event.event_financials || event.event_financials.gross_sales === 0) && (
          <View style={{ borderWidth: 1, borderColor: p.brand, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.brand, marginBottom: 4 }}>EVENT HAS PASSED</Text>
              <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>No sales figures entered yet — add the actuals to keep your reports accurate.</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push({ pathname: `/(tabs)/events/${id}/edit`, params: { trail: childTrail } })}
              accessibilityRole="button"
              accessibilityLabel="Add sales figures"
              style={{ backgroundColor: p.brand, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ color: p.bg, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>ADD →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Application journey ── */}
        <ApplicationTimeline currentStatus={event.status} />

        {/* ── Update status ── */}
        <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700' }}>UPDATE STATUS</Text>
            {justChanged && (
              <Animated.View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                borderWidth: 1, borderColor: S.green,
                paddingHorizontal: 8, paddingVertical: 3,
                transform: [{ scale: confirmScale }], opacity: confirmScale,
              }}>
                <Ionicons name="checkmark" size={11} color={S.green} />
                <Text style={{ color: S.green, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                  {STATUS_LABELS[justChanged].toUpperCase()}
                </Text>
              </Animated.View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {STATUSES.map((s) => {
              const active = event.status === s;
              const color = STATUS_DOT[s] ?? p.textFaint;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => !active && handleStatusChange(s)}
                  disabled={updatingStatus || active}
                  accessibilityRole="radio"
                  accessibilityLabel={`Set status to ${STATUS_LABELS[s]}`}
                  accessibilityState={{ selected: active, disabled: updatingStatus || active }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 6,
                    borderWidth: 1,
                    backgroundColor: active ? color : 'transparent',
                    borderColor: active ? color : p.borderStrong,
                    opacity: updatingStatus && !active ? 0.5 : 1,
                  }}
                >
                  <View style={{ width: 6, height: 6, backgroundColor: active ? p.bg : color }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: active ? p.bg : p.text }}>
                    {STATUS_LABELS[s].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Application URL ── */}
        {event.application_url && (
          <TouchableOpacity
            onPress={() => event.application_url && Linking.openURL(event.application_url)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 14, marginBottom: 16 }}
          >
            <Ionicons name="link-outline" size={16} color={p.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: p.brand }}>APPLICATION PORTAL</Text>
              <Text style={{ fontSize: 11, color: p.textMuted, fontStyle: 'italic', marginTop: 2 }} numberOfLines={1}>
                {event.application_url}
              </Text>
            </View>
            <Ionicons name="open-outline" size={14} color={p.textFaint} />
          </TouchableOpacity>
        )}

        {/* ── Weather ── */}
        {event.location && event.date && (
          <View style={{ marginBottom: 16 }}>
            <FarSectionRule label="Weather forecast" />
            <View style={{ marginTop: 12 }}>
              <WeatherCard
                location={event.location}
                startDate={event.date}
                endDate={event.end_date}
                eventId={event.id}
                onTempFetched={setForecastTemp}
              />
            </View>
          </View>
        )}

        {/* ── Trade-aware prediction ── */}
        {forecastTemp !== null && (
          <View style={{ marginBottom: 16 }}>
            <PredictionInsightCard tradeType={tradeType} forecastTempC={forecastTemp} />
          </View>
        )}

        {/* ── Financials ── */}
        {event.event_financials && (
          <View style={{ marginBottom: 16 }}>
            <FarSectionRule label="Financials" />
            <View style={{ marginTop: 12 }}>
              <FinancialsCard financials={event.event_financials} calculations={event.calculations} />
            </View>
          </View>
        )}

        {/* ── Daily takings ── */}
        {event.end_date && event.end_date !== event.date && (
          <View style={{ marginBottom: 16 }}>
            <DailyTakingsCard eventId={event.id} startDate={event.date} endDate={event.end_date} readOnly />
          </View>
        )}

        {/* ── Staffing ── */}
        {event.staffing_entries?.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <StaffingList entries={event.staffing_entries} />
          </View>
        )}

        {/* ── Infrastructure ── */}
        {event.infrastructure_items?.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <InfrastructureList items={event.infrastructure_items} />
          </View>
        )}

        {/* ── Documents ── */}
        <View style={{ marginBottom: 16 }}>
          <DocumentsSection eventId={event.id} />
        </View>

        {/* ── COGS ── */}
        <View style={{ marginBottom: 16 }}>
          <CogsSection eventId={event.id} existingCogs={event.event_financials?.cost_of_goods ?? 0} />
        </View>

        {/* ── Details ── */}
        <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, marginBottom: 16 }}>
          <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>DETAILS</Text>
          {event.application_date && (
            <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: p.border }}>
              <Text style={{ fontSize: 12, color: p.textMuted, width: 120 }}>Applied on</Text>
              <Text style={{ fontSize: 12, color: p.text }}>{formatDate(event.application_date)}</Text>
            </View>
          )}
          {event.overnight_stay && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: p.border }}>
              <Text style={{ fontSize: 12, color: p.textMuted, width: 120 }}>Overnight stay</Text>
              <Text style={{ fontSize: 12, color: p.brand, fontWeight: '600' }}>Yes</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: p.border }}>
            <Text style={{ fontSize: 12, color: p.textMuted, width: 120 }}>Docs uploaded</Text>
            <Text style={{ fontSize: 12, color: event.documents_uploaded ? S.green : p.textFaint, fontWeight: event.documents_uploaded ? '600' : '400' }}>
              {event.documents_uploaded ? 'Yes' : 'Not yet'}
            </Text>
          </View>
          {event.url_last_checked_at && (
            <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: p.border }}>
              <Text style={{ fontSize: 12, color: p.textMuted, width: 120 }}>Last checked</Text>
              <Text style={{ fontSize: 12, color: p.text }}>{formatDate(event.url_last_checked_at)}</Text>
            </View>
          )}
          {event.description && (
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: p.border }}>
              <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>{event.description}</Text>
            </View>
          )}
          {event.notes && (
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: p.border }}>
              <Text style={{ fontSize: 9, color: p.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 }}>NOTES</Text>
              <Text style={{ fontSize: 12, color: p.text, lineHeight: 18 }}>{event.notes}</Text>
            </View>
          )}
        </View>

        {/* ── Actions ── */}
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={handleDuplicate}
            disabled={duplicating}
            accessibilityRole="button"
            accessibilityLabel="Duplicate event"
            accessibilityState={{ disabled: duplicating }}
            style={{ borderWidth: 1, borderColor: p.borderStrong, paddingVertical: 14, alignItems: 'center', minHeight: 48, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="copy-outline" size={15} color={p.textMuted} />
            <Text style={{ color: p.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>
              {duplicating ? 'DUPLICATING…' : 'DUPLICATE EVENT'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Delete Event',
                `Are you sure you want to delete "${event.name}"? This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDelete },
                ],
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Delete event"
            style={{ borderWidth: 1, borderColor: S.red, paddingVertical: 14, alignItems: 'center', minHeight: 48 }}
          >
            <Text style={{ color: S.red, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>DELETE EVENT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
