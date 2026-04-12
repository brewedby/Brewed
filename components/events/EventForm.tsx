import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useForm, Controller, useFieldArray, Control, UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { eventSchema } from '@/lib/validations/event.schema';
import type { EventFormValues } from '@/lib/validations/event.schema';
import { FormField } from '@/components/shared/FormField';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatCurrency } from '@/lib/formatters';
import {
  STATUSES, STATUS_LABELS, STATUS_COLORS,
  INFRASTRUCTURE_CATEGORIES, INFRASTRUCTURE_CATEGORY_LABELS,
  UNIT_STATUS_COLORS,
} from '@/constants';
import type { ConcessionsCompany, ApplicationStatus, InfrastructureCategory, Unit } from '@/types';

const TABS = ['Details', 'Financials', 'Staffing', 'Costs', 'Notes'] as const;

/** Convert DD/MM/YYYY → YYYY-MM-DD. Passes through ISO dates and empty strings unchanged. */
function ukToIso(val: string | undefined | null): string {
  if (!val) return '';
  const match = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return val;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">
      {title}
    </Text>
  );
}

function CalcRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center py-1">
      <Text className={`text-xs ${highlight ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
        {label}
      </Text>
      <Text className={`text-xs font-semibold ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCIALS TAB SUB-COMPONENT
// ─────────────────────────────────────────────────────────────
function FinancialsTabContent({
  control,
  watch,
}: {
  control: Control<EventFormValues>;
  watch: UseFormWatch<EventFormValues>;
}) {
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
    <View className="gap-4">
      <View className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <Text className="text-amber-800 text-sm font-medium mb-0.5">Recording financials</Text>
        <Text className="text-amber-700 text-xs">
          Fill in after the event. Profit is calculated on net (ex-VAT) sales.
        </Text>
      </View>

      {/* ── SALES & VAT ── */}
      <SectionHeader title="Sales & VAT" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="standard_rated_sales"
          render={({ field }) => (
            <CurrencyInput
              label="Hot drinks & food — 20% VAT"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="zero_rated_sales"
          render={({ field }) => (
            <CurrencyInput
              label="Cold drinks — 0% VAT"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        {(zeroRated > 0 || standardRated > 0) && (
          <View className="bg-slate-50 rounded-lg p-3 mt-1 gap-0.5">
            <CalcRow label="Standard-rated ex-VAT" value={formatCurrency(standardRatedNet)} />
            <CalcRow label="VAT collected (20%)" value={formatCurrency(vatCollected)} />
            <CalcRow
              label="Total net sales (ex-VAT)"
              value={formatCurrency(totalNetSales)}
              highlight
            />
          </View>
        )}
      </View>

      {/* ── CONCESSIONS COMPANY ── */}
      <SectionHeader title="Concessions Company / Organiser" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="concessions_commission_pct"
          render={({ field }) => (
            <FormField
              label="Commission % (taken on net sales ex-VAT)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <Controller
          control={control}
          name="pitch_fee"
          render={({ field }) => (
            <CurrencyInput
              label="Pitch fee paid upfront"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="pitch_fee_refund_pct"
          render={({ field }) => (
            <FormField
              label="Pitch fee refund % (before commission deduction)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <Controller
          control={control}
          name="power_fee"
          render={({ field }) => (
            <CurrencyInput
              label="Power / site fee"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        {(pitchFee > 0 || commissionPct > 0 || powerFee > 0) && (
          <View className="bg-slate-50 rounded-lg p-3 mt-1 gap-0.5">
            <CalcRow
              label={`Commission (${commissionPct}% × net sales)`}
              value={formatCurrency(commissionAmount)}
            />
            <CalcRow
              label={`Pitch fee refund gross (${refundPct}%)`}
              value={formatCurrency(pitchFeeRefundGross)}
            />
            <CalcRow
              label="Commission deducted from refund"
              value={`-${formatCurrency(commissionAmount)}`}
            />
            <CalcRow
              label="Net refund received"
              value={formatCurrency(Math.max(0, netRefund))}
            />
            {netRefund < 0 && (
              <CalcRow
                label="Extra commission owed"
                value={formatCurrency(Math.abs(netRefund))}
              />
            )}
            {powerFee > 0 && (
              <CalcRow
                label="Power / site fee"
                value={formatCurrency(powerFee)}
              />
            )}
            <CalcRow
              label="Total site cost"
              value={formatCurrency(Math.max(0, effectivePitchFee))}
              highlight
            />
          </View>
        )}
      </View>

      {/* ── YOUR OTHER COSTS ── */}
      <SectionHeader title="Your Other Costs" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="cost_of_goods"
          render={({ field }) => (
            <CurrencyInput
              label="Cost of Goods / COGS (stock, ingredients)"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="staffing_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Staffing Total (or use Staffing tab)"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="travel_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Travel & Fuel"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="camping_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Camping Costs"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="equipment_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Equipment & Hire"
              value={field.value}
              onChangeValue={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="other_costs"
          render={({ field }) => (
            <CurrencyInput
              label="Other Costs"
              value={field.value}
              onChangeValue={field.onChange}
              placeholder="packaging, ice, gas..."
            />
          )}
        />
      </View>

      {/* ── MILK & CONSUMABLES ── */}
      <SectionHeader title="Milk & Consumables" />
      <View className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
        <Controller
          control={control}
          name="fresh_milk_litres"
          render={({ field }) => (
            <FormField
              label="Fresh Milk (litres)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <Controller
          control={control}
          name="alt_milk_litres"
          render={({ field }) => (
            <FormField
              label="Alternative Milk (litres)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(parseFloat(t) || 0)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
        />
        <View className="bg-blue-50 rounded-xl px-3 py-2.5">
          <Text className="text-blue-700 text-xs">
            💡 Milk usage is tracked on the dashboard for stock planning.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PROPS & MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
interface Props {
  defaultValues?: Partial<EventFormValues>;
  companies: ConcessionsCompany[];
  units: Unit[];
  onSubmit: (data: EventFormValues) => Promise<void>;
  submitLabel?: string;
}

export function EventForm({
  defaultValues,
  companies,
  units,
  onSubmit,
  submitLabel = 'Save Application',
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Details');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: '',
      date: '',
      end_date: '',
      location: '',
      description: '',
      application_date: '',
      status: 'pending',
      notes: '',
      company_id: '',
      unit_id: '',
      application_url: '',
      overnight_stay: false,
      documents_uploaded: false,
      gross_sales: 0,
      zero_rated_sales: 0,
      standard_rated_sales: 0,
      concessions_commission_pct: 0,
      pitch_fee_refund_pct: 0,
      cost_of_goods: 0,
      pitch_fee: 0,
      power_fee: 0,
      travel_costs: 0,
      camping_costs: 0,
      equipment_costs: 0,
      other_costs: 0,
      staffing_costs: 0,
      fresh_milk_litres: 0,
      alt_milk_litres: 0,
      staffing_entries: [],
      infrastructure_items: [],
      ...defaultValues,
    },
  });

  const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
    control,
    name: 'staffing_entries',
  });
  const { fields: infraFields, append: appendInfra, remove: removeInfra } = useFieldArray({
    control,
    name: 'infrastructure_items',
  });

  const selectedStatus = watch('status') as ApplicationStatus;
  const selectedCompanyId = watch('company_id');
  const selectedUnitId = watch('unit_id');

  async function handleFormSubmit(data: EventFormValues) {
    setLoading(true);
    try {
      const converted = {
        ...data,
        date: ukToIso(data.date),
        end_date: data.end_date ? ukToIso(data.end_date) : data.end_date,
        application_date: data.application_date
          ? ukToIso(data.application_date)
          : data.application_date,
      };
      await onSubmit(converted);
      router.back();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to save. Check your connection and try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Tab bar */}
      <View className="bg-white border-b border-slate-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 4 }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full ${
                activeTab === tab ? 'bg-slate-900' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-white' : 'text-slate-600'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">

        {/* ══════════════════════════════════════════
            DETAILS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Details' && (
          <View className="gap-4">
            {/* Name */}
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormField
                  label="Event / Market Name"
                  required
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.name?.message}
                  placeholder="Brighton Food Festival 2025"
                />
              )}
            />

            {/* Dates — side by side */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <FormField
                      label="Start Date"
                      required
                      value={field.value}
                      onChangeText={field.onChange}
                      error={errors.date?.message}
                      placeholder="DD/MM/YYYY"
                      keyboardType="numbers-and-punctuation"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="end_date"
                  render={({ field }) => (
                    <FormField
                      label="End Date"
                      value={field.value ?? ''}
                      onChangeText={field.onChange}
                      placeholder="DD/MM/YYYY"
                      keyboardType="numbers-and-punctuation"
                    />
                  )}
                />
              </View>
            </View>

            {/* Location */}
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <FormField
                  label="Location"
                  required
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.location?.message}
                  placeholder="Brighton, East Sussex"
                />
              )}
            />

            {/* Applied On */}
            <Controller
              control={control}
              name="application_date"
              render={({ field }) => (
                <FormField
                  label="Applied On"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder="DD/MM/YYYY"
                  keyboardType="numbers-and-punctuation"
                />
              )}
            />

            {/* Application URL */}
            <Controller
              control={control}
              name="application_url"
              render={({ field }) => (
                <FormField
                  label="Application Portal URL"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder="https://organiser.com/apply"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            />
            <View className="bg-blue-50 rounded-xl px-3 py-2.5 -mt-2">
              <Text className="text-blue-700 text-xs">
                💡 Save the URL and the app will alert you if the page changes — useful for spotting
                when decisions are published.
              </Text>
            </View>

            {/* Unit selector */}
            <View>
              <Text className="text-slate-600 text-sm font-semibold mb-2">Unit / Vehicle</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {/* None pill */}
                <TouchableOpacity
                  onPress={() => setValue('unit_id', '')}
                  className={`px-3 py-2 rounded-xl border ${
                    !selectedUnitId
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !selectedUnitId ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    None
                  </Text>
                </TouchableOpacity>

                {units.map((u) => {
                  const active = selectedUnitId === u.id;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setValue('unit_id', u.id)}
                      className={`px-3 py-2 rounded-xl border ${
                        active ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {u.name}
                      </Text>
                      {u.registration ? (
                        <Text
                          className={`text-xs mt-0.5 ${
                            active ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {u.registration}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Application Status selector */}
            <View>
              <Text className="text-slate-600 text-sm font-semibold mb-2">
                Application Status <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const colors = STATUS_COLORS[s];
                  const active = selectedStatus === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setValue('status', s)}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                        borderWidth: 1,
                        backgroundColor: active ? colors.bgHex : '#ffffff',
                        borderColor: active ? 'transparent' : '#e2e8f0',
                      }}
                    >
                      <View
                        style={{ backgroundColor: colors.dot, width: 7, height: 7, borderRadius: 4, marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 14, fontWeight: '500', color: active ? colors.textHex : '#4b5563' }}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Concessions Company selector */}
            <View>
              <Text className="text-slate-600 text-sm font-semibold mb-2">
                Concessions Company / Organiser
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setValue('company_id', '')}
                  className={`px-3 py-1.5 rounded-xl border ${
                    !selectedCompanyId
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      !selectedCompanyId ? 'text-white font-medium' : 'text-slate-500'
                    }`}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {companies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setValue('company_id', c.id)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      selectedCompanyId === c.id
                        ? 'bg-slate-900 border-slate-900'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selectedCompanyId === c.id
                          ? 'text-white font-medium'
                          : 'text-slate-600'
                      }`}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <FormField
                  label="Description"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder="What is the event? Expected footfall, etc."
                  multiline
                  numberOfLines={3}
                  style={{ textAlignVertical: 'top', minHeight: 72 }}
                />
              )}
            />

            {/* Toggle rows */}
            <View className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {/* Overnight Stay */}
              <Controller
                control={control}
                name="overnight_stay"
                render={({ field }) => (
                  <View className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-medium text-slate-700">
                        Overnight Stay Required
                      </Text>
                    </View>
                    <Switch
                      value={field.value ?? false}
                      onValueChange={field.onChange}
                      trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                )}
              />
              <View className="border-t border-slate-100" />
              {/* Documents Uploaded */}
              <Controller
                control={control}
                name="documents_uploaded"
                render={({ field }) => (
                  <View className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-medium text-slate-700">
                        Paperwork / Docs Uploaded
                      </Text>
                    </View>
                    <Switch
                      value={field.value ?? false}
                      onValueChange={field.onChange}
                      trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                )}
              />
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            FINANCIALS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Financials' && (
          <FinancialsTabContent control={control} watch={watch} />
        )}

        {/* ══════════════════════════════════════════
            STAFFING TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Staffing' && (
          <View className="gap-4">
            <View className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <Text className="text-blue-800 text-xs">
                Add individual staff members. Their total cost will override the staffing figure in
                Financials.
              </Text>
            </View>
            {staffFields.map((field, i) => (
              <View key={field.id} className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-slate-700 text-sm">
                    Staff Member {i + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeStaff(i)}>
                    <Text className="text-red-400 text-sm font-medium">Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control}
                  name={`staffing_entries.${i}.staff_name`}
                  render={({ field: f }) => (
                    <FormField
                      label="Name"
                      value={f.value}
                      onChangeText={f.onChange}
                      placeholder="Jane Smith"
                      error={errors.staffing_entries?.[i]?.staff_name?.message}
                    />
                  )}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`staffing_entries.${i}.hours_worked`}
                      render={({ field: f }) => (
                        <FormField
                          label="Hours"
                          value={String(f.value || '')}
                          onChangeText={(t) => f.onChange(parseFloat(t) || 0)}
                          keyboardType="decimal-pad"
                          placeholder="8"
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`staffing_entries.${i}.hourly_rate`}
                      render={({ field: f }) => (
                        <CurrencyInput
                          label="Hourly Rate"
                          value={f.value}
                          onChangeValue={f.onChange}
                        />
                      )}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendStaff({ staff_name: '', hours_worked: 0, hourly_rate: 0 })}
              className="border-2 border-dashed border-slate-300 rounded-xl py-4 items-center"
            >
              <Text className="text-slate-500 font-medium">+ Add Staff Member</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════
            COSTS TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Costs' && (
          <View className="gap-4">
            {infraFields.map((field, i) => (
              <View key={field.id} className="bg-white rounded-xl p-4 border border-slate-100 gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-slate-700 text-sm">Cost Item {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeInfra(i)}>
                    <Text className="text-red-400 text-sm font-medium">Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control}
                  name={`infrastructure_items.${i}.description`}
                  render={({ field: f }) => (
                    <FormField
                      label="Description"
                      value={f.value}
                      onChangeText={f.onChange}
                      placeholder="Generator hire"
                      error={errors.infrastructure_items?.[i]?.description?.message}
                    />
                  )}
                />
                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {INFRASTRUCTURE_CATEGORIES.map((cat) => {
                      const current = watch(
                        `infrastructure_items.${i}.category`,
                      ) as InfrastructureCategory;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() =>
                            setValue(`infrastructure_items.${i}.category`, cat)
                          }
                          className={`px-3 py-1 rounded-full border ${
                            current === cat
                              ? 'bg-slate-900 border-slate-900'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              current === cat ? 'text-white' : 'text-slate-600'
                            }`}
                          >
                            {INFRASTRUCTURE_CATEGORY_LABELS[cat]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <Controller
                  control={control}
                  name={`infrastructure_items.${i}.cost`}
                  render={({ field: f }) => (
                    <CurrencyInput label="Cost" value={f.value} onChangeValue={f.onChange} />
                  )}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendInfra({ description: '', category: 'other', cost: 0 })}
              className="border-2 border-dashed border-slate-300 rounded-xl py-4 items-center"
            >
              <Text className="text-slate-500 font-medium">+ Add Cost Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════
            NOTES TAB
        ══════════════════════════════════════════ */}
        {activeTab === 'Notes' && (
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormField
                label="Notes & Observations"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="Footfall, parking, setup notes, what sold well..."
                multiline
                numberOfLines={12}
                style={{ textAlignVertical: 'top', minHeight: 240 }}
              />
            )}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit button */}
      <View className="px-4 pb-8 pt-3 bg-white border-t border-slate-100">
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          className="bg-amber-500 py-4 rounded-2xl items-center"
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
