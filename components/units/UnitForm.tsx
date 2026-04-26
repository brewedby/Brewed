import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { format, parseISO, isValid } from 'date-fns';
import { unitSchema } from '@/lib/validations/unit.schema';
import { FormField } from '@/components/shared/FormField';
import { WheelColumn } from '@/components/shared/WheelColumn';
import { UNIT_STATUSES, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '@/constants';
import type { UnitFormValues } from '@/lib/validations/unit.schema';
import type { UnitStatus } from '@/types';

const VEHICLE_TYPES = ['Van', 'Truck', 'Trailer', 'Fridge Van', 'Transport Unit'];
const SERVICE_INTERVALS = [
  { value: '6months', label: 'Every 6 months' },
  { value: '1year',   label: 'Every year' },
] as const;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(month1based: number, year: number): number {
  return new Date(year, month1based, 0).getDate();
}

function DatePickerModal({
  visible, value, onConfirm, onClose,
}: {
  visible: boolean; value: string; onConfirm: (iso: string) => void; onClose: () => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 2 + i);

  const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [yearIdx, setYearIdx] = useState(2);

  useEffect(() => {
    if (!visible) return;
    const p = (() => {
      if (!value) return now;
      try { const d = parseISO(value); return isValid(d) ? d : now; }
      catch { return now; }
    })();
    const yi = years.indexOf(p.getFullYear());
    setDayIdx(p.getDate() - 1);
    setMonthIdx(p.getMonth());
    setYearIdx(yi >= 0 ? yi : 2);
  }, [visible]);

  const numDays = daysInMonth(monthIdx + 1, years[yearIdx]);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const clampedDayIdx = Math.min(dayIdx, numDays - 1);

  function handleConfirm() {
    const year = years[yearIdx];
    const month = monthIdx + 1;
    const day = Math.min(dayIdx + 1, daysInMonth(month, year));
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onConfirm(iso);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 36 }}>
            <WheelColumn
              key={`day-${monthIdx}-${yearIdx}`}
              items={days}
              initialIndex={clampedDayIdx}
              onChange={(idx) => setDayIdx(idx)}
            />
            <WheelColumn
              key="month"
              items={MONTHS_SHORT}
              initialIndex={monthIdx}
              onChange={(idx) => setMonthIdx(idx)}
            />
            <WheelColumn
              key="year"
              items={years}
              initialIndex={yearIdx}
              onChange={(idx) => setYearIdx(idx)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DimensionInput({
  label, value, onChange,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? value.toFixed(2) : '');

  useEffect(() => {
    setText(value != null ? value.toFixed(2) : '');
  }, [value]);

  function handleChange(raw: string) {
    // Allow digits and one decimal point only
    const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    // Limit to 2 decimal places
    const match = cleaned.match(/^(\d{0,2})(\.\d{0,2})?$/);
    const safe = match ? cleaned : text;
    setText(safe);
    const parsed = parseFloat(safe);
    onChange(!isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null);
  }

  function handleBlur() {
    if (value != null) setText(value.toFixed(2));
    else if (text === '.' || text === '') setText('');
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 11,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: '#0f172a', padding: 0 }}
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          value={text}
          onChangeText={handleChange}
          onBlur={handleBlur}
          maxLength={6}
          accessibilityLabel={`${label} in metres`}
        />
        <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '500', marginLeft: 4 }}>m</Text>
      </View>
    </View>
  );
}

function DatePickerButton({
  label, value, onChange, required,
}: {
  label: string; value: string; onChange: (iso: string) => void; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const displayText = value
    ? (() => { try { const d = parseISO(value); return isValid(d) ? format(d, 'd MMM yyyy') : value; } catch { return value; } })()
    : '';

  return (
    <View>
      <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
        {label}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ffffff',
        }}
      >
        <Text style={{ color: displayText ? '#0f172a' : '#94a3b8', fontSize: 15 }}>
          {displayText || 'Select date'}
        </Text>
        <Text style={{ fontSize: 16 }}>📅</Text>
      </TouchableOpacity>
      {show && (
        <DatePickerModal
          visible={show}
          value={value}
          onConfirm={onChange}
          onClose={() => setShow(false)}
        />
      )}
    </View>
  );
}

interface Props {
  defaultValues?: Partial<UnitFormValues>;
  onSubmit: (data: UnitFormValues) => Promise<void>;
  submitLabel?: string;
}

export function UnitForm({ defaultValues, onSubmit, submitLabel = 'Save Unit' }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as Resolver<UnitFormValues>,
    defaultValues: {
      name: '',
      registration: '',
      notes: '',
      status: 'active',
      vehicle_type: '',
      height_m: null,
      length_m: null,
      width_m: null,
      mot_date: '',
      tax_date: '',
      service_date: '',
      service_interval: '1year',
      ...defaultValues,
    },
  });

  async function handleFormSubmit(data: UnitFormValues) {
    setLoading(true);
    try {
      await onSubmit(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fafaf9' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16 }}>

          {/* Name */}
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <FormField
                label="Unit Name"
                required
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
                placeholder="e.g. The Bean Machine"
              />
            )}
          />

          {/* Registration */}
          <Controller
            control={control}
            name="registration"
            render={({ field }) => (
              <FormField
                label="Registration / Plate Number"
                value={field.value ?? ''}
                onChangeText={(text) => field.onChange(text.toUpperCase())}
                error={errors.registration?.message}
                placeholder="e.g. AB12 CDE"
                autoCapitalize="characters"
              />
            )}
          />

          {/* Vehicle type */}
          <Controller
            control={control}
            name="vehicle_type"
            render={({ field }) => (
              <View>
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Vehicle Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {VEHICLE_TYPES.map((vt) => {
                    const isSelected = field.value === vt;
                    return (
                      <TouchableOpacity
                        key={vt}
                        onPress={() => field.onChange(isSelected ? '' : vt)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                          backgroundColor: isSelected ? '#1c1917' : '#ffffff',
                          borderColor: isSelected ? '#1c1917' : '#e7e5e4',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : '#57534e' }}>
                          {vt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* Dimensions */}
          <View>
            <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Dimensions (metres)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Controller
                control={control}
                name="height_m"
                render={({ field }) => (
                  <DimensionInput label="Height" value={field.value ?? null} onChange={field.onChange} />
                )}
              />
              <Controller
                control={control}
                name="length_m"
                render={({ field }) => (
                  <DimensionInput label="Length" value={field.value ?? null} onChange={field.onChange} />
                )}
              />
              <Controller
                control={control}
                name="width_m"
                render={({ field }) => (
                  <DimensionInput label="Width" value={field.value ?? null} onChange={field.onChange} />
                )}
              />
            </View>
          </View>

          {/* Status */}
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <View>
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {UNIT_STATUSES.map((s) => {
                    const colors = UNIT_STATUS_COLORS[s as UnitStatus];
                    const isSelected = field.value === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => field.onChange(s)}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                          backgroundColor: isSelected ? colors.bgHex : '#ffffff',
                          borderColor: isSelected ? 'transparent' : '#e7e5e4',
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dot, marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? colors.textHex : '#78716c' }} numberOfLines={1}>
                          {UNIT_STATUS_LABELS[s as UnitStatus]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* MOT date */}
          <Controller
            control={control}
            name="mot_date"
            render={({ field }) => (
              <DatePickerButton
                label="MOT Expiry Date"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />

          {/* Tax date */}
          <Controller
            control={control}
            name="tax_date"
            render={({ field }) => (
              <DatePickerButton
                label="Tax (VED) Expiry Date"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />

          {/* Service date */}
          <Controller
            control={control}
            name="service_date"
            render={({ field }) => (
              <DatePickerButton
                label="Last Service Date"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />

          {/* Service interval */}
          <Controller
            control={control}
            name="service_interval"
            render={({ field }) => (
              <View>
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Service Interval</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SERVICE_INTERVALS.map(({ value, label }) => {
                    const isSelected = field.value === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => field.onChange(value)}
                        style={{
                          flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                          backgroundColor: isSelected ? '#1c1917' : '#ffffff',
                          borderColor: isSelected ? '#1c1917' : '#e7e5e4',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#ffffff' : '#57534e' }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormField
                label="Notes"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="Any notes about this unit..."
                multiline
                numberOfLines={4}
                style={{ textAlignVertical: 'top', minHeight: 96 }}
              />
            )}
          />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          style={{ backgroundColor: '#b45309', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
