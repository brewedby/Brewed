import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { eventSchema } from '@/lib/validations/event.schema';
import type { EventFormValues } from '@/lib/validations/event.schema';
import { FormField } from '@/components/shared/FormField';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { STATUSES, STATUS_LABELS, INFRASTRUCTURE_CATEGORIES, INFRASTRUCTURE_CATEGORY_LABELS } from '@/constants';
import type { ConcessionsCompany, ApplicationStatus, InfrastructureCategory } from '@/types';

const TABS = ['Info', 'Financials', 'Staffing', 'Infrastructure', 'Notes'] as const;

interface Props {
  defaultValues?: Partial<EventFormValues>;
  companies: ConcessionsCompany[];
  onSubmit: (data: EventFormValues) => Promise<void>;
  submitLabel?: string;
}

export function EventForm({ defaultValues, companies, onSubmit, submitLabel = 'Save Event' }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Info');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: '', date: '', end_date: '', location: '', description: '',
      application_date: '', status: 'pending', notes: '', company_id: '',
      gross_sales: 0, cost_of_goods: 0, pitch_fee: 0, travel_costs: 0,
      equipment_costs: 0, other_costs: 0, staffing_costs: 0,
      staffing_entries: [], infrastructure_items: [],
      ...defaultValues,
    },
  });

  const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
    control, name: 'staffing_entries',
  });
  const { fields: infraFields, append: appendInfra, remove: removeInfra } = useFieldArray({
    control, name: 'infrastructure_items',
  });

  const selectedStatus = watch('status') as ApplicationStatus;
  const selectedCompanyId = watch('company_id');

  async function handleFormSubmit(data: any) {
    setLoading(true);
    try {
      await onSubmit(data);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-stone-50">
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-stone-100 px-2 py-1 max-h-12" contentContainerStyle={{ alignItems: 'center', gap: 4 }}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full ${activeTab === tab ? 'bg-amber-700' : 'bg-stone-100'}`}
          >
            <Text className={`text-sm font-medium ${activeTab === tab ? 'text-white' : 'text-stone-600'}`}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {/* INFO TAB */}
        {activeTab === 'Info' && (
          <View className="gap-4">
            <Controller
              control={control} name="name"
              render={({ field }) => (
                <FormField
                  label="Event Name" required
                  value={field.value} onChangeText={field.onChange}
                  error={errors.name?.message}
                  placeholder="Summer Food Festival"
                />
              )}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control} name="date"
                  render={({ field }) => (
                    <FormField
                      label="Start Date" required
                      value={field.value} onChangeText={field.onChange}
                      error={errors.date?.message}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numbers-and-punctuation"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control} name="end_date"
                  render={({ field }) => (
                    <FormField
                      label="End Date"
                      value={field.value ?? ''} onChangeText={field.onChange}
                      placeholder="YYYY-MM-DD (optional)"
                      keyboardType="numbers-and-punctuation"
                    />
                  )}
                />
              </View>
            </View>
            <Controller
              control={control} name="location"
              render={({ field }) => (
                <FormField
                  label="Location" required
                  value={field.value} onChangeText={field.onChange}
                  error={errors.location?.message}
                  placeholder="Brighton, East Sussex"
                />
              )}
            />
            <Controller
              control={control} name="application_date"
              render={({ field }) => (
                <FormField
                  label="Application Date"
                  value={field.value ?? ''} onChangeText={field.onChange}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />
              )}
            />

            {/* Status */}
            <View>
              <Text className="text-stone-600 text-sm font-medium mb-2">Status <Text className="text-red-500">*</Text></Text>
              <View className="flex-row flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setValue('status', s)}
                    className={`px-3 py-1.5 rounded-full border ${selectedStatus === s ? 'bg-amber-700 border-amber-700' : 'bg-white border-stone-200'}`}
                  >
                    <Text className={`text-sm font-medium ${selectedStatus === s ? 'text-white' : 'text-stone-600'}`}>
                      {STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Company picker */}
            <View>
              <Text className="text-stone-600 text-sm font-medium mb-2">Concessions Company</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setValue('company_id', '')}
                  className={`px-3 py-1.5 rounded-full border ${!selectedCompanyId ? 'bg-amber-700 border-amber-700' : 'bg-white border-stone-200'}`}
                >
                  <Text className={`text-sm font-medium ${!selectedCompanyId ? 'text-white' : 'text-stone-600'}`}>None</Text>
                </TouchableOpacity>
                {companies.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setValue('company_id', c.id)}
                    className={`px-3 py-1.5 rounded-full border ${selectedCompanyId === c.id ? 'bg-amber-700 border-amber-700' : 'bg-white border-stone-200'}`}
                  >
                    <Text className={`text-sm font-medium ${selectedCompanyId === c.id ? 'text-white' : 'text-stone-600'}`} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Controller
              control={control} name="description"
              render={({ field }) => (
                <FormField
                  label="Description"
                  value={field.value ?? ''} onChangeText={field.onChange}
                  placeholder="Brief description of the event"
                  multiline numberOfLines={3}
                  style={{ textAlignVertical: 'top', minHeight: 72 }}
                />
              )}
            />
          </View>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'Financials' && (
          <View className="gap-4">
            <View className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <Text className="text-amber-800 text-sm">Enter your sales and costs for this event. Gross profit and net profit are calculated automatically.</Text>
            </View>
            <Controller
              control={control} name="gross_sales"
              render={({ field }) => (
                <CurrencyInput label="Gross Sales (Total Takings)" value={field.value} onChangeValue={field.onChange} />
              )}
            />
            <Controller
              control={control} name="cost_of_goods"
              render={({ field }) => (
                <CurrencyInput label="Cost of Goods (COGS)" value={field.value} onChangeValue={field.onChange} />
              )}
            />
            <Controller
              control={control} name="pitch_fee"
              render={({ field }) => (
                <CurrencyInput label="Pitch Fee" value={field.value} onChangeValue={field.onChange} />
              )}
            />
            <Controller
              control={control} name="staffing_costs"
              render={({ field }) => (
                <CurrencyInput label="Staffing Costs (or use Staffing tab)" value={field.value} onChangeValue={field.onChange} />
              )}
            />
            <Controller
              control={control} name="travel_costs"
              render={({ field }) => (
                <CurrencyInput label="Travel Costs" value={field.value} onChangeValue={field.onChange} />
              )}
            />
            <Controller
              control={control} name="equipment_costs"
              render={({ field }) => (
                <CurrencyInput label="Equipment Costs" value={field.value} onChangeValue={field.onChange} />
              )}
            />
            <Controller
              control={control} name="other_costs"
              render={({ field }) => (
                <CurrencyInput label="Other Costs" value={field.value} onChangeValue={field.onChange} />
              )}
            />
          </View>
        )}

        {/* STAFFING TAB */}
        {activeTab === 'Staffing' && (
          <View className="gap-4">
            <View className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <Text className="text-blue-800 text-sm">Add individual staff members with hours and rate. This will override the staffing cost in the Financials tab.</Text>
            </View>
            {staffFields.map((field, index) => (
              <View key={field.id} className="bg-white rounded-xl p-4 border border-stone-100 gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-stone-700">Staff #{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeStaff(index)}>
                    <Text className="text-red-500 text-sm">Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control} name={`staffing_entries.${index}.staff_name`}
                  render={({ field: f }) => (
                    <FormField
                      label="Name" value={f.value} onChangeText={f.onChange}
                      placeholder="Jane Smith"
                      error={errors.staffing_entries?.[index]?.staff_name?.message}
                    />
                  )}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control} name={`staffing_entries.${index}.hours_worked`}
                      render={({ field: f }) => (
                        <FormField
                          label="Hours" value={String(f.value || '')}
                          onChangeText={(t) => f.onChange(parseFloat(t) || 0)}
                          keyboardType="decimal-pad" placeholder="8"
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control} name={`staffing_entries.${index}.hourly_rate`}
                      render={({ field: f }) => (
                        <CurrencyInput
                          label="Hourly Rate" value={f.value} onChangeValue={f.onChange}
                        />
                      )}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendStaff({ staff_name: '', hours_worked: 0, hourly_rate: 0 })}
              className="border-2 border-dashed border-amber-300 rounded-xl py-4 items-center"
            >
              <Text className="text-amber-700 font-medium">+ Add Staff Member</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INFRASTRUCTURE TAB */}
        {activeTab === 'Infrastructure' && (
          <View className="gap-4">
            {infraFields.map((field, index) => (
              <View key={field.id} className="bg-white rounded-xl p-4 border border-stone-100 gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-stone-700">Item #{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeInfra(index)}>
                    <Text className="text-red-500 text-sm">Remove</Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control} name={`infrastructure_items.${index}.description`}
                  render={({ field: f }) => (
                    <FormField
                      label="Description" value={f.value} onChangeText={f.onChange}
                      placeholder="Generator hire"
                      error={errors.infrastructure_items?.[index]?.description?.message}
                    />
                  )}
                />
                <View>
                  <Text className="text-stone-600 text-sm font-medium mb-2">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {INFRASTRUCTURE_CATEGORIES.map((cat) => {
                      const current = watch(`infrastructure_items.${index}.category`) as InfrastructureCategory;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setValue(`infrastructure_items.${index}.category`, cat)}
                          className={`px-3 py-1 rounded-full border ${current === cat ? 'bg-amber-700 border-amber-700' : 'bg-white border-stone-200'}`}
                        >
                          <Text className={`text-xs font-medium ${current === cat ? 'text-white' : 'text-stone-600'}`}>
                            {INFRASTRUCTURE_CATEGORY_LABELS[cat]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <Controller
                  control={control} name={`infrastructure_items.${index}.cost`}
                  render={({ field: f }) => (
                    <CurrencyInput label="Cost" value={f.value} onChangeValue={f.onChange} />
                  )}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => appendInfra({ description: '', category: 'other', cost: 0 })}
              className="border-2 border-dashed border-amber-300 rounded-xl py-4 items-center"
            >
              <Text className="text-amber-700 font-medium">+ Add Infrastructure Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NOTES TAB */}
        {activeTab === 'Notes' && (
          <View>
            <Controller
              control={control} name="notes"
              render={({ field }) => (
                <FormField
                  label="Notes"
                  value={field.value ?? ''} onChangeText={field.onChange}
                  placeholder="Any notes about the event, parking, footfall, etc."
                  multiline numberOfLines={10}
                  style={{ textAlignVertical: 'top', minHeight: 200 }}
                />
              )}
            />
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      {/* Submit button */}
      <View className="px-4 pb-6 pt-3 bg-white border-t border-stone-100">
        <TouchableOpacity
          onPress={handleSubmit(handleFormSubmit)}
          className="bg-amber-700 py-4 rounded-xl items-center"
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text className="text-white font-bold text-base">{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
