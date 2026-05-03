import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/themeContext';
import { useAuth } from '@/lib/auth';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/lib/mutations/productCatalog';
import { ProductForm } from './ProductForm';
import { PRODUCT_CATEGORIES, VATABLE_CATEGORIES, type ProductCatalogItem } from '@/types/cogs';
import type { ProductFormValues } from '@/lib/validations/product.schema';

type ScreenView = 'list' | 'add' | 'edit';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function marginColor(pct: number, brand: string): string {
  if (pct >= 60) return '#22c55e';
  if (pct >= 40) return brand;
  return '#dc2626';
}

export function ProductCatalogScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { user } = useAuth();
  const { data: products = [], isLoading } = useProductCatalog();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [view, setView] = useState<ScreenView>('list');
  const [editing, setEditing] = useState<ProductCatalogItem | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    products.filter((prod) =>
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      (prod.sku?.toLowerCase() ?? '').includes(search.toLowerCase())
    ),
    [products, search],
  );

  const sections = useMemo(() =>
    PRODUCT_CATEGORIES.map((cat) => ({
      category: cat,
      data: filtered.filter((prod) => prod.category === cat.value),
    })).filter((s) => s.data.length > 0),
    [filtered],
  );

  async function handleAdd(values: ProductFormValues) {
    if (!user) return;
    await createProduct.mutateAsync({ data: values, userId: user.id });
    setView('list');
  }

  async function handleEdit(values: ProductFormValues) {
    if (!editing) return;
    await updateProduct.mutateAsync({ id: editing.id, data: values });
    setEditing(null);
    setView('list');
  }

  function confirmDelete(product: ProductCatalogItem) {
    Alert.alert(
      'Remove Product',
      `Remove "${product.name}" from your menu? Existing COGS calculations won't change.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteProduct.mutate(product.id) },
      ],
    );
  }

  const totalProducts = products.length;
  const activeProducts = products.filter((prod) => prod.is_active).length;
  const avgMargin = useMemo(() => {
    const withPrice = products.filter((prod) => prod.selling_price > 0);
    if (withPrice.length === 0) return null;
    const avg = withPrice.reduce((sum, prod) => {
      const netPrice = prod.category === 'hot_drinks' ? prod.selling_price / 1.2 : prod.selling_price;
      return sum + ((netPrice - prod.unit_cost) / netPrice) * 100;
    }, 0) / withPrice.length;
    return avg;
  }, [products]);

  function renderProduct({ item }: { item: ProductCatalogItem }) {
    const isVatable = item.category === 'hot_drinks';
    const netPrice = isVatable ? item.selling_price / 1.2 : item.selling_price;
    const grossMargin = item.selling_price > 0
      ? ((netPrice - item.unit_cost) / netPrice) * 100
      : null;

    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: p.surface, borderWidth: 1, borderColor: p.border,
        padding: 12, marginBottom: 6, gap: 6,
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: p.text }}>{item.name}</Text>
            {!item.is_active && (
              <View style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: p.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>inactive</Text>
              </View>
            )}
          </View>
          {item.sku ? <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 1 }}>SKU: {item.sku}</Text> : null}
        </View>

        {/* Price | COGS | Margin */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 52, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: p.textFaint, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Price</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: p.text }}>£{item.selling_price.toFixed(2)}</Text>
            {isVatable && <Text style={{ fontSize: 8, color: p.textFaint, textAlign: 'center' }}>inc. VAT</Text>}
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: p.border, marginHorizontal: 2 }} />
          <View style={{ width: 52, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: p.textFaint, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>COGS</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: p.brand }}>£{item.unit_cost.toFixed(2)}</Text>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: p.border, marginHorizontal: 2 }} />
          <View style={{ width: 52, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: p.textFaint, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Margin</Text>
            {grossMargin !== null ? (
              <Text style={{ fontSize: 14, fontWeight: '700', color: marginColor(grossMargin, p.brand) }}>
                {grossMargin.toFixed(0)}%
              </Text>
            ) : (
              <Text style={{ fontSize: 14, color: p.textFaint }}>—</Text>
            )}
            {isVatable && <Text style={{ fontSize: 8, color: p.textFaint, textAlign: 'center' }}>ex-VAT</Text>}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 0 }}>
          <TouchableOpacity
            onPress={() => { setEditing(item); setView('edit'); }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 15, color: p.textMuted }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 15, color: '#dc2626' }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSectionHeader({ section }: { section: { category: typeof PRODUCT_CATEGORIES[number]; data: ProductCatalogItem[] } }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 6, paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: p.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
          {section.category.emoji} {section.category.label}
        </Text>
        <Text style={{ fontSize: 12, color: p.textFaint }}>{section.data.length}</Text>
      </View>
    );
  }

  const menuColumnHeader = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, paddingTop: 14, paddingBottom: 4 }}>
      <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: p.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Product
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {['Price', 'COGS', 'Margin'].map((label, i) => (
          <View key={label} style={{ width: i === 1 ? 56 : 52, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: p.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ width: 72 }} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 14,
          backgroundColor: p.surface, borderBottomWidth: 2, borderBottomColor: p.text,
        }}>
          {view === 'list' ? (
            <>
              <View>
                <Text style={{ fontFamily: tokens.type.display, fontSize: 20, color: p.text }}>Menu & COGS</Text>
                <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>Price, cost & margin per product</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close product menu"
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 20, color: p.text }}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => { setView('list'); setEditing(null); }}
                accessibilityRole="button"
                accessibilityLabel="Back to menu"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ color: p.brand, fontWeight: '600', fontSize: 14 }}>‹ Back</Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text }}>
                {view === 'add' ? 'Add Product' : 'Edit Product'}
              </Text>
              <View style={{ width: 60 }} />
            </>
          )}
        </View>

        {view === 'list' && (
          <>
            {/* Summary strip */}
            <View style={{ flexDirection: 'row', backgroundColor: p.surface, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: p.border, alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: p.brand }}>{totalProducts}</Text>
                <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 2 }}>Products</Text>
              </View>
              <View style={{ width: 1, height: 32, backgroundColor: p.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: p.brand }}>{activeProducts}</Text>
                <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 2 }}>Active</Text>
              </View>
              <View style={{ width: 1, height: 32, backgroundColor: p.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: avgMargin !== null ? marginColor(avgMargin, p.brand) : p.textFaint }}>
                  {avgMargin !== null ? `${avgMargin.toFixed(0)}%` : '—'}
                </Text>
                <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 2 }}>Avg Margin</Text>
              </View>
            </View>

            {/* Search */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: p.surface, margin: 16,
              borderWidth: 1, borderColor: p.border,
              paddingHorizontal: 12, paddingVertical: 8, gap: 8,
            }}>
              <Text style={{ fontSize: 14, color: p.textFaint }}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search menu..."
                placeholderTextColor={p.textFaint}
                style={{ flex: 1, fontSize: 14, color: p.text }}
                accessibilityLabel="Search products"
                returnKeyType="search"
                clearButtonMode="while-editing"
                onSubmitEditing={() => {}}
              />
            </View>

            {/* Menu list */}
            {isLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={p.brand} />
              </View>
            ) : sections.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text, marginBottom: 10 }}>
                  {search ? 'No matches' : 'Menu is empty'}
                </Text>
                <Text style={{ color: p.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
                  {search
                    ? 'Try a different search term.'
                    : 'Add your menu items with selling price and cost. Brewed uses these to calculate COGS automatically from your sales reports.'}
                </Text>
              </View>
            ) : (
              <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderProduct}
                renderSectionHeader={renderSectionHeader}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
                ListHeaderComponent={menuColumnHeader}
                stickySectionHeadersEnabled={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Add button */}
            <View style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              paddingHorizontal: 20, paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              backgroundColor: p.bg, borderTopWidth: 1, borderTopColor: p.border,
            }}>
              <TouchableOpacity
                onPress={() => setView('add')}
                accessibilityRole="button"
                accessibilityLabel="Add new product to menu"
                style={{ backgroundColor: p.text, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Text style={{ color: p.bg, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>+ ADD MENU ITEM</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {view === 'add' && (
          <ProductForm
            onSubmit={handleAdd}
            onCancel={() => setView('list')}
            submitting={createProduct.isPending}
          />
        )}

        {view === 'edit' && editing && (
          <ProductForm
            initial={editing}
            onSubmit={handleEdit}
            onCancel={() => { setEditing(null); setView('list'); }}
            submitting={updateProduct.isPending}
          />
        )}
      </View>
    </Modal>
  );
}
