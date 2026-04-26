import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues } from '@/lib/validations/product.schema';
import { PRODUCT_CATEGORIES, UNIT_OPTIONS, type ProductCatalogItem } from '@/types/cogs';

interface ProductFormProps {
  initial?: ProductCatalogItem;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export function ProductForm({ initial, onSubmit, onCancel, submitting }: ProductFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name:      initial?.name      ?? '',
      sku:       initial?.sku       ?? '',
      unit_cost: initial?.unit_cost ?? 0,
      unit:      initial?.unit      ?? 'cup',
      category:  initial?.category  ?? 'hot_drinks',
      is_active: initial?.is_active ?? true,
    },
  });

  const isEdit = !!initial;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        <Text style={styles.sectionTitle}>Product name *</Text>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextInput
              {...field}
              onChangeText={field.onChange}
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g. Flat White"
              placeholderTextColor="#a8a29e"
              accessibilityLabel="Product name"
            />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

        <Text style={styles.sectionTitle}>Cost per unit (£) *</Text>
        <Text style={styles.hint}>What it costs YOU to make one unit — not the selling price</Text>
        <Controller
          control={control}
          name="unit_cost"
          render={({ field }) => (
            <View style={styles.currencyRow}>
              <Text style={styles.currencySymbol}>£</Text>
              <TextInput
                value={field.value === 0 ? '' : String(field.value)}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                keyboardType="decimal-pad"
                placeholder="0.65"
                placeholderTextColor="#a8a29e"
                accessibilityLabel="Unit cost in pounds"
              />
            </View>
          )}
        />
        {errors.unit_cost && <Text style={styles.error}>{errors.unit_cost.message}</Text>}

        <Text style={styles.sectionTitle}>Unit *</Text>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {UNIT_OPTIONS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => field.onChange(u)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Unit: ${u}`}
                    accessibilityState={{ checked: field.value === u }}
                    style={[styles.pill, field.value === u && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, field.value === u && styles.pillTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        />

        <Text style={styles.sectionTitle}>Category *</Text>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {PRODUCT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => field.onChange(cat.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${cat.label} category`}
                  accessibilityState={{ checked: field.value === cat.value }}
                  style={[styles.pill, field.value === cat.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, field.value === cat.value && styles.pillTextActive]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Text style={styles.sectionTitle}>SKU / Barcode (optional)</Text>
        <Text style={styles.hint}>
          If your POS exports a product code, add it here for exact matching
        </Text>
        <Controller
          control={control}
          name="sku"
          render={({ field }) => (
            <TextInput
              {...field}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              style={styles.input}
              placeholder="e.g. FW-SM or 5012345678900"
              placeholderTextColor="#a8a29e"
              autoCapitalize="none"
              accessibilityLabel="SKU or barcode"
            />
          )}
        />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <TouchableOpacity
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Save product changes' : 'Add product to catalog'}
            style={[styles.saveButton, submitting && { opacity: 0.6 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Add Product'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: '#1c1917', marginBottom: 4, marginTop: 16 },
  hint:         { fontSize: 11, color: '#a8a29e', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1c1917', backgroundColor: '#fff', marginBottom: 4,
  },
  inputError: { borderColor: '#dc2626' },
  error:      { fontSize: 11, color: '#dc2626', marginBottom: 4 },
  currencyRow:   { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 4 },
  currencySymbol: { fontSize: 18, color: '#78716c', fontWeight: '600' as const },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e7e5e4', backgroundColor: '#fff',
  },
  pillActive:     { backgroundColor: '#1c1917', borderColor: '#1c1917' },
  pillText:       { fontSize: 13, color: '#57534e', fontWeight: '500' as const },
  pillTextActive: { color: '#fff' },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#e7e5e4', alignItems: 'center' as const,
  },
  cancelText: { color: '#57534e', fontWeight: '600' as const },
  saveButton: {
    flex: 2, paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#92400e', alignItems: 'center' as const,
  },
  saveText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
};
