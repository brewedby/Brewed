import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, isValid } from 'date-fns';
import { unitSchema } from '@/lib/validations/unit.schema';
import { FormField } from '@/components/shared/FormField';
import { WheelColumn } from '@/components/shared/WheelColumn';
import { useTheme } from '@/lib/themeContext';
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
  const { tokens } = useTheme();
  const p = tokens.palette;
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 2 + i);

  const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [yearIdx, setYearIdx] = useState(2);

  useEffect(() => {
    if (!visible) return;
    const parsed = (() => {
      if (!value) return now;
      try { const d = parseISO(value); return isValid(d) ? d : now; }
      catch { return now; }
    })();
    const yi = years.indexOf(parsed.getFullYear());
    setDayIdx(parsed.getDate() - 1);
    setMonthIdx(parsed.getMonth());
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
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: p.bg, borderTopWidth: 2, borderTopColor: p.text }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: p.border }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 15, color: p.brand, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: p.text }}>Done</Text>
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
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [text, setText] = useState(value != null ? value.toFixed(2) : '');

  useEffect(() => {
    setText(value != null ? value.toFixed(2) : '');
  }, [value]);

  function handleChange(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
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
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>{label.toUpperCase()}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: p.border,
        backgroundColor: p.surface, paddingHorizontal: 14, paddingVertical: 12,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: p.text, padding: 0 }}
          placeholder="0.00"
          placeholderTextColor={p.textFaint}
          keyboardType="decimal-pad"
          value={text}
          onChangeText={handleChange}
          onBlur={handleBlur}
          maxLength={6}
          accessibilityLabel={`${label} in metres`}
        />
        <Text style={{ color: p.textFaint, fontSize: 14, marginLeft: 4 }}>m</Text>
      </View>
    </View>
  );
}

function DatePickerButton({
  label, value, onChange, required,
}: {
  label: string; value: string; onChange: (iso: string) => void; required?: boolean;
}) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const [show, setShow] = useState(false);
  const displayText = value
    ? (() => { try { const d = parseISO(value); return isValid(d) ? format(d, 'd MMM yyyy') : value; } catch { return value; } })()
    : '';

  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>
        {label.toUpperCase()}{required && <Text style={{ color: '#dc2626' }}> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1, borderColor: p.border,
          paddingHorizontal: 14, paddingVertical: 12, backgroundColor: p.surface,
        }}
      >
        <Text style={{ color: displayText ? p.text : p.textFaint, fontSize: 15 }}>
          {displayText || 'Select date'}
        </Text>
        <Text style={{ fontSize: 14 }}>📅</Text>
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
  const { tokens } = useTheme();
  const p = tokens.palette;

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
      // Navigation is the parent screen's responsibility — different
      // entry points need different destinations.
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>VEHICLE TYPE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {VEHICLE_TYPES.map((vt) => {
                    const isSelected = field.value === vt;
                    return (
                      <TouchableOpacity
                        key={vt}
                        onPress={() => field.onChange(isSelected ? '' : vt)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderWidth: isSelected ? 2 : 1,
                          backgroundColor: isSelected ? p.text : p.surface,
                          borderColor: isSelected ? p.text : p.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? p.bg : p.textMuted }}>
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
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>DIMENSIONS (METRES)</Text>
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
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>STATUS</Text>
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
                          paddingHorizontal: 12, paddingVertical: 10, borderWidth: isSelected ? 2 : 1,
                          backgroundColor: isSelected ? `${colors.dot}18` : p.surface,
                          borderColor: isSelected ? colors.dot : p.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.dot, marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? p.text : p.textMuted }} numberOfLines={1}>
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
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>SERVICE INTERVAL</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SERVICE_INTERVALS.map(({ value, label }) => {
                    const isSelected = field.value === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => field.onChange(value)}
                        style={{
                          flex: 1, paddingVertical: 10, borderWidth: isSelected ? 2 : 1, alignItems: 'center',
                          backgroundColor: isSelected ? p.text : p.surface,
                          borderColor: isSelected ? p.text : p.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? p.bg : p.textMuted }}>
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

      <View style={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12, backgroundColor: p.bg, borderTopWidth: 1, borderTopColor: p.border }}>
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          style={{ backgroundColor: p.text, paddingVertical: 16, alignItems: 'center' }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={p.bg} />
          ) : (
            <Text style={{ color: p.bg, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>{submitLabel.toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
