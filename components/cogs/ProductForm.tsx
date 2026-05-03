import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@/lib/themeContext';
import { productSchema, type ProductFormValues } from '@/lib/validations/product.schema';
import {
  UNIT_OPTIONS,
  getCategoriesForTrade,
  getCategoryDefinition,
  type ProductCatalogItem,
} from '@/types/cogs';

interface ProductFormProps {
  initial?: ProductCatalogItem;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  /** Trade type from profile (e.g. "Coffee", "Burgers"). Drives category list. */
  tradeType?: string | null;
}

function defaultTiers(item?: ProductCatalogItem) {
  if (item?.price_tiers?.length) return item.price_tiers;
  if (item?.selling_price != null && item.selling_price > 0) {
    return [{ label: 'Standard', price: item.selling_price }];
  }
  return [{ label: 'Standard', price: 0 }];
}

export function ProductForm({ initial, onSubmit, onCancel, submitting, tradeType }: ProductFormProps) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  // Resolve the available categories for this trade type, plus include
  // the editing item's existing category if it isn't in the default list
  // (so legacy data is editable without forcing a category change).
  const tradeCats = getCategoriesForTrade(tradeType);
  const categories = (() => {
    if (!initial?.category) return tradeCats;
    if (tradeCats.find((c) => c.value === initial.category)) return tradeCats;
    return [...tradeCats, getCategoryDefinition(initial.category)];
  })();

  const defaultCategory = initial?.category ?? categories[0]?.value ?? 'other';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name:        initial?.name      ?? '',
      sku:         initial?.sku       ?? '',
      price_tiers: defaultTiers(initial),
      unit_cost:   initial?.unit_cost ?? 0,
      unit:        initial?.unit      ?? 'cup',
      category:    defaultCategory,
      is_active:   initial?.is_active ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'price_tiers' });

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

        {/* ── Price Tiers ── */}
        {fieldLabel('Selling prices', true)}
        <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 10 }}>
          Add a price for each venue type (e.g. Standard, Festival, Market). The first is used as the default.
        </Text>

        {fields.map((field, index) => {
          const tierError = errors.price_tiers?.[index];
          const isOnly = fields.length === 1;
          return (
            <View key={field.id} style={{ marginBottom: 8 }}>
              <View style={{
                flexDirection: 'row', gap: 8, alignItems: 'flex-start',
                borderWidth: 1, borderColor: index === 0 ? p.borderStrong : p.border,
                backgroundColor: index === 0 ? p.surface : p.bg,
                padding: 10,
              }}>
                {/* Label */}
                <Controller
                  control={control}
                  name={`price_tiers.${index}.label`}
                  render={({ field: f }) => (
                    <TextInput
                      {...f}
                      onChangeText={f.onChange}
                      placeholder="e.g. Standard"
                      placeholderTextColor={p.textFaint}
                      accessibilityLabel={`Price tier ${index + 1} label`}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: tierError?.label ? '#dc2626' : p.border,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        fontSize: 14,
                        color: p.text,
                        backgroundColor: p.bg,
                      }}
                    />
                  )}
                />
                {/* Price */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 16, color: p.textMuted, fontWeight: '600' }}>£</Text>
                  <Controller
                    control={control}
                    name={`price_tiers.${index}.price`}
                    render={({ field: f }) => (
                      <TextInput
                        value={f.value === 0 ? '' : String(f.value)}
                        onChangeText={f.onChange}
                        onBlur={f.onBlur}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={p.textFaint}
                        accessibilityLabel={`Price tier ${index + 1} price`}
                        style={{
                          width: 72,
                          borderWidth: 1,
                          borderColor: tierError?.price ? '#dc2626' : p.border,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          fontSize: 14,
                          color: p.text,
                          backgroundColor: p.bg,
                        }}
                      />
                    )}
                  />
                </View>
                {/* Remove */}
                <TouchableOpacity
                  onPress={() => !isOnly && remove(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove price tier ${index + 1}`}
                  style={{
                    width: 36, height: 36,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isOnly ? p.border : '#dc2626',
                    opacity: isOnly ? 0.3 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, color: isOnly ? p.textFaint : '#dc2626', fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
              {(tierError?.label || tierError?.price) && (
                <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                  {tierError?.label?.message ?? tierError?.price?.message}
                </Text>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={() => append({ label: '', price: 0 })}
          accessibilityRole="button"
          accessibilityLabel="Add price tier"
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            paddingVertical: 10,
            borderWidth: 1, borderColor: p.border,
            borderStyle: 'dashed',
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: p.brand, fontWeight: '700', letterSpacing: 0.5 }}>+ ADD PRICE TIER</Text>
        </TouchableOpacity>
        {errors.price_tiers?.root && (
          <Text style={{ fontSize: 11, color: '#dc2626', marginBottom: 4 }}>{errors.price_tiers.root.message}</Text>
        )}

        {/* ── Cost to make ── */}
        <View style={{ marginTop: 4 }}>
          {fieldLabel('Cost to make (£)', true)}
          <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 8 }}>Your actual ingredient cost per unit</Text>
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
              {categories.map((cat) => (
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
