import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO, isValid } from 'date-fns';
import { useForm, Controller, useFieldArray, Control, UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventSchema } from '@/lib/validations/event.schema';
import type { EventFormValues } from '@/lib/validations/event.schema';
import { FormField } from '@/components/shared/FormField';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { WheelColumn } from '@/components/shared/WheelColumn';
import { formatCurrency } from '@/lib/formatters';
import { useTheme } from '@/lib/themeContext';
import {
  STATUSES, STATUS_LABELS, STATUS_COLORS,
  INFRASTRUCTURE_CATEGORIES, INFRASTRUCTURE_CATEGORY_LABELS,
} from '@/constants';
import type { ConcessionsCompany, ApplicationStatus, InfrastructureCategory, Unit } from '@/types';
import { DailyTakingsCard } from '@/components/events/DailyTakingsCard';

const TABS = ['Details', 'Financials', 'Staffing', 'Costs', 'Notes'] as const;

function ukToIso(val: string | undefined | null): string {
  if (!val) return '';
  const match = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return val;
}

function SectionHeader({ title }: { title: string }) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, marginTop: 8, marginBottom: 4 }}>
      {title.toUpperCase()}
    </Text>
  );
}

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
  const palette = tokens.palette;
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i);

  const [dayIdx, setDayIdx] = useState(now.getDate() - 1);
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [yearIdx, setYearIdx] = useState(5);

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
    setYearIdx(yi >= 0 ? yi : 5);
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
        <View style={{ backgroundColor: palette.bg, borderTopWidth: 2, borderTopColor: palette.text }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 15, color: palette.brand, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: palette.text }}>Done</Text>
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

function DatePickerButton({
  label, value, onChange, required,
}: {
  label: string; value: string; onChange: (isoDate: string) => void; required?: boolean;
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
      <DatePickerModal
        visible={show}
        value={value}
        onConfirm={onChange}
        onClose={() => setShow(false)}
      />
    </View>
  );
}

const PCT_CHIPS = [0, 5, 10, 15, 20, 25, 30];

function PctChips({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {PCT_CHIPS.map((pct) => {
        const active = value === pct;
        return (
          <TouchableOpacity
            key={pct}
            onPress={() => onChange(pct)}
            style={{
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: active ? 2 : 1,
              borderColor: active ? p.text : p.border,
              backgroundColor: active ? p.text : p.surface,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: active ? p.bg : p.textMuted }}>
              {pct}%
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CalcRow({
  label, value, highlight,
}: {
  label: string; value: string; highlight?: boolean;
}) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, color: highlight ? p.text : p.textMuted, fontWeight: highlight ? '600' : '400' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: highlight ? p.text : p.textMuted }}>
        {value}
      </Text>
    </View>
  );
}

function FinancialsTabContent({
  control, watch,
}: {
  control: Control<EventFormValues>; watch: UseFormWatch<EventFormValues>;
}) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const zeroRated = watch('zero_rated_sales') ?? 0;
  const standardRated = watch('standard_rated_sales') ?? 0;
  const commissionPct = watch('concessions_commission_pct') ?? 0;
  const pitchFee = watch('pitch_fee') ?? 0;
  const refundPct = watch('pitch_fee_refund_pct') ?? 0;
  const powerFee = watch('power_fee') ?? 0;

  const standardRatedNet = standardRated / 1.2;
  const vatCollected = standardRated - standardRatedNet;
  const totalNetSales = zeroRated + standardRatedNet;
  const commissionAmount = totalNetSales * (commissionPct / 100);
  const pitchFeeRefundGross = pitchFee * (refundPct / 100);
  const netRefund = pitchFeeRefundGross - commissionAmount;
  const effectivePitchFee = pitchFee - pitchFeeRefundGross + commissionAmount + powerFee;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 12 }}>
        <Text style={{ fontSize: 12, color: p.textMuted, fontWeight: '600', marginBottom: 4 }}>Recording financials</Text>
        <Text style={{ fontSize: 12, color: p.textMuted }}>
          Fill in after the event. Profit is calculated on net (ex-VAT) sales.
        </Text>
      </View>

      <SectionHeader title="Sales & VAT" />
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
        <Controller
          control={control} name="zero_rated_sales"
          render={({ field }) => (
            <CurrencyInput label="Cold drinks — 0% VAT" value={field.value} onChangeValue={field.onChange} />
          )}
        />
        <Controller
          control={control} name="standard_rated_sales"
          render={({ field }) => (
            <CurrencyInput label="Hot drinks & food — 20% VAT" value={field.value} onChangeValue={field.onChange} />
          )}
        />
        {(zeroRated > 0 || standardRated > 0) && (
          <View style={{ backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, padding: 12, gap: 2 }}>
            <CalcRow label="Standard-rated ex-VAT" value={formatCurrency(standardRatedNet)} />
            <CalcRow label="VAT collected (20%)" value={formatCurrency(vatCollected)} />
            <CalcRow label="Total net sales (ex-VAT)" value={formatCurrency(totalNetSales)} highlight />
          </View>
        )}
      </View>

      <SectionHeader title="Concessions Company / Organiser" />
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
        <Controller
          control={control} name="concessions_commission_pct"
          render={({ field }) => (
            <View>
              <FormField
                label="Commission % (taken on net sales ex-VAT)"
                value={field.value ? String(field.value) : ''}
                onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
                keyboardType="decimal-pad" placeholder="0"
              />
              <PctChips value={field.value ?? 0} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control} name="pitch_fee"
          render={({ field }) => (
            <CurrencyInput label="Pitch fee paid upfront" value={field.value} onChangeValue={field.onChange} />
          )}
        />
        <Controller
          control={control} name="pitch_fee_refund_pct"
          render={({ field }) => (
            <View>
              <FormField
                label="Pitch fee refund % (before commission deduction)"
                value={field.value ? String(field.value) : ''}
                onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
                keyboardType="decimal-pad" placeholder="0"
              />
              <PctChips value={field.value ?? 0} onChange={field.onChange} />
            </View>
          )}
        />
        <Controller
          control={control} name="power_fee"
          render={({ field }) => (
            <CurrencyInput label="Power / site fee" value={field.value} onChangeValue={field.onChange} />
          )}
        />
        {(pitchFee > 0 || commissionPct > 0 || powerFee > 0) && (
          <View style={{ backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, padding: 12, gap: 2 }}>
            <CalcRow label={`Commission (${commissionPct}% × net sales)`} value={formatCurrency(commissionAmount)} />
            <CalcRow label={`Pitch fee refund gross (${refundPct}%)`} value={formatCurrency(pitchFeeRefundGross)} />
            <CalcRow label="Commission deducted from refund" value={`-${formatCurrency(commissionAmount)}`} />
            <CalcRow label="Net refund received" value={formatCurrency(Math.max(0, netRefund))} />
            {netRefund < 0 && <CalcRow label="Extra commission owed" value={formatCurrency(Math.abs(netRefund))} />}
            {powerFee > 0 && <CalcRow label="Power / site fee" value={formatCurrency(powerFee)} />}
            <CalcRow label="Total site cost" value={formatCurrency(Math.max(0, effectivePitchFee))} highlight />
          </View>
        )}
      </View>

      <SectionHeader title="Your Other Costs" />
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
        <Controller control={control} name="cost_of_goods"
          render={({ field }) => <CurrencyInput label="Cost of Goods / COGS (stock, ingredients)" value={field.value} onChangeValue={field.onChange} />}
        />
        <Controller control={control} name="staffing_costs"
          render={({ field }) => <CurrencyInput label="Staffing Total (or use Staffing tab)" value={field.value} onChangeValue={field.onChange} />}
        />
        <Controller control={control} name="travel_costs"
          render={({ field }) => <CurrencyInput label="Travel & Fuel" value={field.value} onChangeValue={field.onChange} />}
        />
        <Controller control={control} name="camping_costs"
          render={({ field }) => <CurrencyInput label="Camping Costs" value={field.value} onChangeValue={field.onChange} />}
        />
        <Controller control={control} name="equipment_costs"
          render={({ field }) => <CurrencyInput label="Equipment & Hire" value={field.value} onChangeValue={field.onChange} />}
        />
        <Controller control={control} name="other_costs"
          render={({ field }) => <CurrencyInput label="Other Costs" value={field.value} onChangeValue={field.onChange} />}
        />
      </View>

      <SectionHeader title="Milk & Consumables" />
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
        <Controller control={control} name="fresh_milk_litres"
          render={({ field }) => (
            <FormField label="Fresh Milk (litres)" value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)} keyboardType="decimal-pad" placeholder="0" />
          )}
        />
        <Controller control={control} name="alt_milk_litres"
          render={({ field }) => (
            <FormField label="Alternative Milk (litres)" value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)} keyboardType="decimal-pad" placeholder="0" />
          )}
        />
        <View style={{ backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 12, color: p.textMuted }}>
            💡 Milk usage is tracked on the dashboard for stock planning.
          </Text>
        </View>
      </View>

      <SectionHeader title="Mileage" />
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
        <Controller control={control} name="miles_driven"
          render={({ field }) => (
            <FormField label="Miles Driven (round trip)" value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)} keyboardType="decimal-pad" placeholder="0" />
          )}
        />
        {(watch('miles_driven') ?? 0) > 0 && (
          <View style={{ backgroundColor: p.bg, borderWidth: 1, borderColor: p.border, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, color: p.textMuted }}>
              HMRC allowance: £{((watch('miles_driven') ?? 0) * 0.45).toFixed(2)} @ 45p/mile
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface Props {
  defaultValues?: Partial<EventFormValues>;
  companies: ConcessionsCompany[];
  units: Unit[];
  onSubmit: (data: EventFormValues) => Promise<void>;
  submitLabel?: string;
  eventId?: string;
}

export function EventForm({
  defaultValues, companies, units, onSubmit, submitLabel = 'Save Application', eventId,
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Details');
  const [loading, setLoading] = useState(false);
  const { tokens } = useTheme();
  const p = tokens.palette;

  const {
    control, handleSubmit, formState: { errors }, setValue, watch,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: '', date: '', end_date: '', location: '', description: '',
      application_date: '', status: 'pending', notes: '', company_id: '',
      unit_ids: [], application_url: '', overnight_stay: false, documents_uploaded: false,
      gross_sales: 0, zero_rated_sales: 0, standard_rated_sales: 0,
      concessions_commission_pct: 0, pitch_fee_refund_pct: 0,
      cost_of_goods: 0, pitch_fee: 0, power_fee: 0,
      travel_costs: 0, camping_costs: 0, equipment_costs: 0, other_costs: 0,
      staffing_costs: 0, fresh_milk_litres: 0, alt_milk_litres: 0, miles_driven: 0,
      staffing_entries: [], infrastructure_items: [],
      ...defaultValues,
    },
  });

  const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({ control, name: 'staffing_entries' });
  const { fields: infraFields, append: appendInfra, remove: removeInfra } = useFieldArray({ control, name: 'infrastructure_items' });

  const selectedStatus = watch('status') as ApplicationStatus;
  const selectedCompanyId = watch('company_id');
  const selectedUnitIds = (watch('unit_ids') ?? []) as string[];
  const watchedDate = watch('date');
  const watchedEndDate = watch('end_date');

  function tabHasError(tab: (typeof TABS)[number]): boolean {
    if (tab === 'Details') {
      return Boolean(errors.name || errors.date || errors.end_date || errors.location ||
        errors.application_date || errors.application_url || errors.status ||
        errors.company_id || errors.description);
    }
    if (tab === 'Financials') {
      return Boolean(errors.gross_sales || errors.zero_rated_sales || errors.standard_rated_sales ||
        errors.concessions_commission_pct || errors.pitch_fee || errors.pitch_fee_refund_pct ||
        errors.power_fee || errors.cost_of_goods || errors.staffing_costs ||
        errors.travel_costs || errors.camping_costs || errors.equipment_costs ||
        errors.other_costs || errors.fresh_milk_litres || errors.alt_milk_litres);
    }
    if (tab === 'Staffing') return Boolean(errors.staffing_entries);
    if (tab === 'Costs') return Boolean(errors.infrastructure_items);
    if (tab === 'Notes') return Boolean(errors.notes);
    return false;
  }

  async function handleFormSubmit(data: EventFormValues) {
    setLoading(true);
    try {
      const converted = {
        ...data,
        date: ukToIso(data.date),
        end_date: data.end_date ? ukToIso(data.end_date) : data.end_date,
        application_date: data.application_date ? ukToIso(data.application_date) : data.application_date,
      };
      await onSubmit(converted);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Navigation is the parent screen's responsibility — different
      // entry points need different destinations.
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
        ? String((e as { message: unknown }).message)
        : 'Failed to save. Check your connection and try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {/* Tab bar */}
      <View style={{ backgroundColor: p.surface, borderBottomWidth: 1, borderBottomColor: p.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 4 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            const hasErr = tabHasError(tab);
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7,
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? p.text : p.border,
                  backgroundColor: isActive ? p.text : p.surface,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: isActive ? p.bg : p.textMuted }}>
                  {tab}
                </Text>
                {hasErr && (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', marginLeft: 5 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        {/* DETAILS TAB */}
        {activeTab === 'Details' && (
          <View style={{ gap: 16 }}>
            <Controller control={control} name="name"
              render={({ field }) => (
                <FormField label="Event / Market Name" required value={field.value}
                  onChangeText={field.onChange} error={errors.name?.message}
                  placeholder="Brighton Food Festival 2025" />
              )}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="date"
                  render={({ field }) => (
                    <DatePickerButton label="Start Date" required value={field.value ?? ''} onChange={field.onChange} />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="end_date"
                  render={({ field }) => (
                    <DatePickerButton label="End Date" value={field.value ?? ''} onChange={field.onChange} />
                  )}
                />
              </View>
            </View>

            <Controller control={control} name="location"
              render={({ field }) => (
                <FormField label="Location" required value={field.value} onChangeText={field.onChange}
                  error={errors.location?.message} placeholder="Brighton, East Sussex" />
              )}
            />

            <Controller control={control} name="application_date"
              render={({ field }) => (
                <DatePickerButton label="Applied On" value={field.value ?? ''} onChange={field.onChange} />
              )}
            />

            <Controller control={control} name="application_url"
              render={({ field }) => (
                <FormField label="Application Portal URL" value={field.value ?? ''} onChangeText={field.onChange}
                  placeholder="https://organiser.com/apply" keyboardType="url" autoCapitalize="none" />
              )}
            />
            <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, paddingHorizontal: 12, paddingVertical: 10, marginTop: -8 }}>
              <Text style={{ fontSize: 12, color: p.textMuted }}>
                💡 Save the URL and the app will alert you if the page changes — useful for spotting when decisions are published.
              </Text>
            </View>

            {/* Unit selector */}
            {units.length > 0 && (
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6 }}>UNITS / VEHICLES</Text>
                <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 8 }}>Select all units attending this event</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {units.map((u) => {
                    const active = selectedUnitIds.includes(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => {
                          const current = selectedUnitIds;
                          setValue('unit_ids', active ? current.filter((id) => id !== u.id) : [...current, u.id]);
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? p.text : p.border,
                          backgroundColor: active ? p.text : p.surface,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: active ? p.bg : p.text }}>
                          {u.name}
                        </Text>
                        {u.registration ? (
                          <Text style={{ fontSize: 11, marginLeft: 6, color: active ? p.textFaint : p.textFaint }}>
                            {u.registration}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedUnitIds.length > 0 && (
                  <TouchableOpacity onPress={() => setValue('unit_ids', [])} style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: p.textFaint }}>Clear selection</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Status selector */}
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>
                APPLICATION STATUS <Text style={{ color: '#dc2626' }}>*</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STATUSES.map((s) => {
                  const colors = STATUS_COLORS[s];
                  const active = selectedStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setValue('status', s)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12, paddingVertical: 8,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? colors.dot : p.border,
                        backgroundColor: active ? `${colors.dot}18` : p.surface,
                      }}
                    >
                      <View style={{ backgroundColor: colors.dot, width: 7, height: 7, borderRadius: 3.5, marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: active ? p.text : p.textMuted }}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Company selector */}
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>
                CONCESSIONS COMPANY / ORGANISER
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setValue('company_id', '')}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: !selectedCompanyId ? 2 : 1,
                    borderColor: !selectedCompanyId ? p.text : p.border,
                    backgroundColor: !selectedCompanyId ? p.text : p.surface,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: !selectedCompanyId ? p.bg : p.textMuted }}>None</Text>
                </TouchableOpacity>
                {companies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setValue('company_id', c.id)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8,
                      borderWidth: selectedCompanyId === c.id ? 2 : 1,
                      borderColor: selectedCompanyId === c.id ? p.text : p.border,
                      backgroundColor: selectedCompanyId === c.id ? p.text : p.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '500', color: selectedCompanyId === c.id ? p.bg : p.text }} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Controller control={control} name="description"
              render={({ field }) => (
                <FormField label="Description" value={field.value ?? ''} onChangeText={field.onChange}
                  placeholder="What is the event? Expected footfall, etc."
                  multiline numberOfLines={3} style={{ textAlignVertical: 'top', minHeight: 72 }} />
              )}
            />

            {/* Toggle rows */}
            <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
              <Controller control={control} name="overnight_stay"
                render={({ field }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
                    <Text style={{ fontSize: 14, color: p.text, flex: 1, marginRight: 12 }}>Overnight Stay Required</Text>
                    <Switch
                      value={field.value ?? false} onValueChange={field.onChange}
                      trackColor={{ false: p.border, true: p.text }} thumbColor={p.bg}
                    />
                  </View>
                )}
              />
              <View style={{ borderTopWidth: 1, borderTopColor: p.border }} />
              <Controller control={control} name="documents_uploaded"
                render={({ field }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
                    <Text style={{ fontSize: 14, color: p.text, flex: 1, marginRight: 12 }}>Paperwork / Docs Uploaded</Text>
                    <Switch
                      value={field.value ?? false} onValueChange={field.onChange}
                      trackColor={{ false: p.border, true: p.text }} thumbColor={p.bg}
                    />
                  </View>
                )}
              />
            </View>
          </View>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'Financials' && (
          <>
            <FinancialsTabContent control={control} watch={watch} />
            {eventId && watchedDate && watchedEndDate && watchedEndDate !== watchedDate && (
              <View style={{ marginTop: 8 }}>
                <DailyTakingsCard eventId={eventId} startDate={watchedDate} endDate={watchedEndDate} />
              </View>
            )}
          </>
        )}

        {/* STAFFING TAB */}
        {activeTab === 'Staffing' && (
          <View style={{ gap: 16 }}>
            <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 12 }}>
              <Text style={{ fontSize: 12, color: p.textMuted }}>
                Add individual staff members. Their total cost will override the staffing figure in Financials.
              </Text>
            </View>
            {staffFields.map((field, i) => (
              <View key={field.id} style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, letterSpacing: 0.5, color: p.textMuted }}>STAFF MEMBER {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeStaff(i)}>
                    <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller control={control} name={`staffing_entries.${i}.staff_name`}
                  render={({ field: f }) => (
                    <FormField label="Name" value={f.value} onChangeText={f.onChange}
                      placeholder="Jane Smith" error={errors.staffing_entries?.[i]?.staff_name?.message} />
                  )}
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Controller control={control} name={`staffing_entries.${i}.hours_worked`}
                      render={({ field: f }) => (
                        <FormField label="Hours" value={String(f.value || '')}
                          onChangeText={(t) => f.onChange(parseFloat(t) || 0)} keyboardType="decimal-pad" placeholder="8" />
                      )}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Controller control={control} name={`staffing_entries.${i}.hourly_rate`}
                      render={({ field: f }) => (
                        <CurrencyInput label="Hourly Rate" value={f.value} onChangeValue={f.onChange} />
                      )}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendStaff({ staff_name: '', hours_worked: 0, hourly_rate: 0 })}
              style={{ borderWidth: 2, borderColor: p.border, borderStyle: 'dashed', paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: p.textMuted, fontWeight: '600' }}>+ Add Staff Member</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* COSTS TAB */}
        {activeTab === 'Costs' && (
          <View style={{ gap: 16 }}>
            {infraFields.map((field, i) => (
              <View key={field.id} style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, letterSpacing: 0.5, color: p.textMuted }}>COST ITEM {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeInfra(i)}>
                    <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller control={control} name={`infrastructure_items.${i}.description`}
                  render={({ field: f }) => (
                    <FormField label="Description" value={f.value} onChangeText={f.onChange}
                      placeholder="Generator hire" error={errors.infrastructure_items?.[i]?.description?.message} />
                  )}
                />
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 8 }}>CATEGORY</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {INFRASTRUCTURE_CATEGORIES.map((cat) => {
                      const current = watch(`infrastructure_items.${i}.category`) as InfrastructureCategory;
                      const isCat = current === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setValue(`infrastructure_items.${i}.category`, cat)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 6,
                            borderWidth: isCat ? 2 : 1,
                            borderColor: isCat ? p.text : p.border,
                            backgroundColor: isCat ? p.text : p.surface,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: isCat ? p.bg : p.textMuted }}>
                            {INFRASTRUCTURE_CATEGORY_LABELS[cat]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <Controller control={control} name={`infrastructure_items.${i}.cost`}
                  render={({ field: f }) => <CurrencyInput label="Cost" value={f.value} onChangeValue={f.onChange} />}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendInfra({ description: '', category: 'other', cost: 0 })}
              style={{ borderWidth: 2, borderColor: p.border, borderStyle: 'dashed', paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: p.textMuted, fontWeight: '600' }}>+ Add Cost Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NOTES TAB */}
        {activeTab === 'Notes' && (
          <Controller control={control} name="notes"
            render={({ field }) => (
              <FormField label="Notes & Observations" value={field.value ?? ''} onChangeText={field.onChange}
                placeholder="Footfall, parking, setup notes, what sold well..."
                multiline numberOfLines={12} style={{ textAlignVertical: 'top', minHeight: 240 }} />
            )}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit button */}
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
