import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@/lib/themeContext';
import { productSchema, type ProductFormValues } from '@/lib/validations/product.schema';
import { PRODUCT_CATEGORIES, UNIT_OPTIONS, type ProductCatalogItem } from '@/types/cogs';

interface ProductFormProps {
  initial?: ProductCatalogItem;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export function ProductForm({ initial, onSubmit, onCancel, submitting }: ProductFormProps) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name:          initial?.name          ?? '',
      sku:           initial?.sku           ?? '',
      selling_price: initial?.selling_price ?? 0,
      unit_cost:     initial?.unit_cost     ?? 0,
      unit:          initial?.unit          ?? 'cup',
      category:      initial?.category      ?? 'hot_drinks',
      is_active:     initial?.is_active     ?? true,
    },
  });

  const isEdit = !!initial;

  const fieldLabel = (label: string, required?: boolean) => (
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6, marginTop: 16, textTransform: 'uppercase' }}>
      {label}{required ? ' *' : ''}
    </Text>
  );

  const inputStyle = (hasError?: boolean) => ({
    borderWidth: 1,
    borderColor: hasError ? '#dc2626' : p.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: p.text,
    backgroundColor: p.surface,
    marginBottom: 4,
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {fieldLabel('Product name', true)}
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextInput
              {...field}
              onChangeText={field.onChange}
              style={inputStyle(!!errors.name)}
              placeholder="e.g. Flat White"
              placeholderTextColor={p.textFaint}
              accessibilityLabel="Product name"
            />
          )}
        />
        {errors.name && <Text style={{ fontSize: 11, color: '#dc2626', marginBottom: 4 }}>{errors.name.message}</Text>}

        {/* Two-column: Selling Price | COGS */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            {fieldLabel('Selling price (£)', true)}
            <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 8 }}>What you charge the customer</Text>
            <Controller
              control={control}
              name="selling_price"
              render={({ field }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 18, color: p.textMuted, fontWeight: '600' }}>£</Text>
                  <TextInput
                    value={field.value === 0 ? '' : String(field.value)}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    style={[inputStyle(!!errors.selling_price), { flex: 1, marginBottom: 0 }]}
                    keyboardType="decimal-pad"
                    placeholder="3.50"
                    placeholderTextColor={p.textFaint}
                    accessibilityLabel="Selling price in pounds"
                  />
                </View>
              )}
            />
            {errors.selling_price && <Text style={{ fontSize: 11, color: '#dc2626', marginBottom: 4 }}>{errors.selling_price.message}</Text>}
          </View>

          <View style={{ flex: 1 }}>
            {fieldLabel('Cost to make (£)', true)}
            <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 8 }}>Your actual cost per unit</Text>
            <Controller
              control={control}
              name="unit_cost"
              render={({ field }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 18, color: p.textMuted, fontWeight: '600' }}>£</Text>
                  <TextInput
                    value={field.value === 0 ? '' : String(field.value)}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    style={[inputStyle(!!errors.unit_cost), { flex: 1, marginBottom: 0 }]}
                    keyboardType="decimal-pad"
                    placeholder="0.65"
                    placeholderTextColor={p.textFaint}
                    accessibilityLabel="Unit cost in pounds"
                  />
                </View>
              )}
            />
            {errors.unit_cost && <Text style={{ fontSize: 11, color: '#dc2626', marginBottom: 4 }}>{errors.unit_cost.message}</Text>}
          </View>
        </View>

        {fieldLabel('Unit', true)}
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
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8,
                      borderWidth: field.value === u ? 2 : 1,
                      borderColor: field.value === u ? p.text : p.border,
                      backgroundColor: field.value === u ? p.text : p.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: field.value === u ? p.bg : p.textMuted, fontWeight: '500' }}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        />

        {fieldLabel('Category', true)}
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
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderWidth: field.value === cat.value ? 2 : 1,
                    borderColor: field.value === cat.value ? p.text : p.border,
                    backgroundColor: field.value === cat.value ? p.text : p.surface,
                  }}
                >
                  <Text style={{ fontSize: 13, color: field.value === cat.value ? p.bg : p.textMuted, fontWeight: '500' }}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        {fieldLabel('SKU / Barcode (optional)')}
        <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 8 }}>
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
              style={inputStyle()}
              placeholder="e.g. FW-SM or 5012345678900"
              placeholderTextColor={p.textFaint}
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
            style={{ flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: p.border, alignItems: 'center' }}
          >
            <Text style={{ color: p.textMuted, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Save product changes' : 'Add product to catalog'}
            style={[{ flex: 2, paddingVertical: 14, backgroundColor: p.text, alignItems: 'center' }, submitting && { opacity: 0.6 }]}
          >
            {submitting ? (
              <ActivityIndicator color={p.bg} size="small" />
            ) : (
              <Text style={{ color: p.bg, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>
                {isEdit ? 'SAVE CHANGES' : 'ADD PRODUCT'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
