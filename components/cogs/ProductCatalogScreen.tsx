import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/lib/mutations/productCatalog';
import { ProductForm } from './ProductForm';
import { PRODUCT_CATEGORIES, type ProductCatalogItem } from '@/types/cogs';
import type { ProductFormValues } from '@/lib/validations/product.schema';

type ScreenView = 'list' | 'add' | 'edit';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function marginColor(pct: number): string {
  if (pct >= 60) return '#15803d';
  if (pct >= 40) return '#b45309';
  return '#dc2626';
}

export function ProductCatalogScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: products = [], isLoading } = useProductCatalog();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [view, setView]     = useState<ScreenView>('list');
  const [editing, setEditing] = useState<ProductCatalogItem | null>(null);
  const [search, setSearch]   = useState('');

  const filtered = useMemo(() =>
    products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku?.toLowerCase() ?? '').includes(search.toLowerCase())
    ),
    [products, search],
  );

  // Group by category for the menu layout
  const sections = useMemo(() => {
    return PRODUCT_CATEGORIES.map((cat) => ({
      category: cat,
      data: filtered.filter((p) => p.category === cat.value),
    })).filter((s) => s.data.length > 0);
  }, [filtered]);

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
  const activeProducts = products.filter((p) => p.is_active).length;
  const avgMargin = useMemo(() => {
    const withPrice = products.filter((p) => p.selling_price > 0);
    if (withPrice.length === 0) return null;
    const avg = withPrice.reduce((sum, p) => sum + ((p.selling_price - p.unit_cost) / p.selling_price) * 100, 0) / withPrice.length;
    return avg;
  }, [products]);

  function renderProduct({ item }: { item: ProductCatalogItem }) {
    const grossMargin = item.selling_price > 0
      ? ((item.selling_price - item.unit_cost) / item.selling_price) * 100
      : null;
    return (
      <View style={styles.menuRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.menuProductName}>{item.name}</Text>
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>inactive</Text>
              </View>
            )}
          </View>
          {item.sku ? <Text style={styles.skuText}>SKU: {item.sku}</Text> : null}
        </View>

        {/* Price | COGS | Margin */}
        <View style={styles.menuNumbers}>
          <View style={styles.menuNumberCol}>
            <Text style={styles.menuNumberLabel}>Price</Text>
            <Text style={styles.menuPrice}>£{item.selling_price.toFixed(2)}</Text>
          </View>
          <View style={[styles.menuNumberCol, styles.menuNumberColMiddle]}>
            <Text style={styles.menuNumberLabel}>COGS</Text>
            <Text style={styles.menuCogs}>£{item.unit_cost.toFixed(2)}</Text>
          </View>
          <View style={styles.menuNumberCol}>
            <Text style={styles.menuNumberLabel}>Margin</Text>
            {grossMargin !== null ? (
              <Text style={[styles.menuMargin, { color: marginColor(grossMargin) }]}>
                {grossMargin.toFixed(0)}%
              </Text>
            ) : (
              <Text style={styles.menuMarginNone}>—</Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 0 }}>
          <TouchableOpacity
            onPress={() => { setEditing(item); setView('edit'); }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil-outline" size={16} color="#78716c" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSectionHeader({ section }: { section: { category: typeof PRODUCT_CATEGORIES[number]; data: ProductCatalogItem[] } }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          {section.category.emoji} {section.category.label}
        </Text>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    );
  }

  // Column header for the menu table
  const menuColumnHeader = (
    <View style={styles.columnHeader}>
      <Text style={[styles.columnHeaderText, { flex: 1 }]}>Product</Text>
      <View style={styles.menuNumbers}>
        <View style={styles.menuNumberCol}>
          <Text style={styles.columnHeaderText}>Price</Text>
        </View>
        <View style={[styles.menuNumberCol, styles.menuNumberColMiddle]}>
          <Text style={styles.columnHeaderText}>COGS</Text>
        </View>
        <View style={styles.menuNumberCol}>
          <Text style={styles.columnHeaderText}>Margin</Text>
        </View>
      </View>
      <View style={{ width: 72 }} />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          {view === 'list' ? (
            <>
              <View>
                <Text style={styles.title}>Menu & COGS</Text>
                <Text style={styles.titleSub}>Price, cost & margin per product</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close product menu"
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color="#1c1917" />
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
                <Ionicons name="chevron-back" size={18} color="#92400e" />
                <Text style={{ color: '#92400e', fontWeight: '600', fontSize: 14 }}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{view === 'add' ? 'Add Product' : 'Edit Product'}</Text>
              <View style={{ width: 60 }} />
            </>
          )}
        </View>

        {view === 'list' && (
          <>
            {/* Summary strip */}
            <View style={styles.summaryStrip}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalProducts}</Text>
                <Text style={styles.summaryLabel}>Products</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{activeProducts}</Text>
                <Text style={styles.summaryLabel}>Active</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, avgMargin !== null ? { color: marginColor(avgMargin) } : {}]}>
                  {avgMargin !== null ? `${avgMargin.toFixed(0)}%` : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Avg Margin</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color="#a8a29e" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search menu..."
                placeholderTextColor="#a8a29e"
                style={styles.searchInput}
                accessibilityLabel="Search products"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={16} color="#a8a29e" />
                </TouchableOpacity>
              )}
            </View>

            {/* Menu list */}
            {isLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#92400e" />
              </View>
            ) : sections.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏷️</Text>
                <Text style={{ fontWeight: '600', color: '#1c1917', fontSize: 16, marginBottom: 6 }}>
                  {search ? 'No matches' : 'Menu is empty'}
                </Text>
                <Text style={{ color: '#a8a29e', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
                  {search
                    ? 'Try a different search term.'
                    : 'Add your menu items with their selling price and cost. Brewed uses these to calculate COGS automatically from your sales reports.'}
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
              />
            )}

            {/* Add button */}
            <View style={[styles.addButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                onPress={() => setView('add')}
                accessibilityRole="button"
                accessibilityLabel="Add new product to menu"
                style={styles.addButton}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Menu Item</Text>
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

const styles = {
  container: { flex: 1, backgroundColor: '#fafaf9' },
  header: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f4',
  },
  title:      { fontSize: 18, fontWeight: '700' as const, color: '#1c1917' },
  titleSub:   { fontSize: 11, color: '#a8a29e', marginTop: 1 },
  closeButton: { padding: 4 },

  summaryStrip: {
    flexDirection: 'row' as const, backgroundColor: '#fff',
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f4',
    alignItems: 'center' as const,
  },
  summaryItem:    { flex: 1, alignItems: 'center' as const },
  summaryValue:   { fontSize: 18, fontWeight: '700' as const, color: '#92400e' },
  summaryLabel:   { fontSize: 11, color: '#a8a29e', marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#f5f5f4' },

  searchRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1c1917' },

  columnHeader: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 2, paddingTop: 14, paddingBottom: 4,
  },
  columnHeaderText: {
    fontSize: 10, fontWeight: '700' as const, color: '#a8a29e',
    textTransform: 'uppercase' as const, letterSpacing: 0.5, textAlign: 'center' as const,
  },

  sectionHeader: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 16, paddingBottom: 6, paddingHorizontal: 2,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '700' as const, color: '#1c1917' },
  sectionCount:      { fontSize: 12, color: '#a8a29e', fontWeight: '500' as const },

  menuRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: '#f5f5f4',
    gap: 6,
  },
  menuProductName: { fontSize: 14, fontWeight: '600' as const, color: '#1c1917' },
  skuText:         { fontSize: 10, color: '#a8a29e', marginTop: 1 },

  menuNumbers: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
  },
  menuNumberCol: {
    width: 52, alignItems: 'center' as const,
  },
  menuNumberColMiddle: {
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f5f5f4',
    marginHorizontal: 2,
  },
  menuNumberLabel: { fontSize: 9, color: '#a8a29e', fontWeight: '600' as const, textTransform: 'uppercase' as const, marginBottom: 2 },
  menuPrice:       { fontSize: 14, fontWeight: '700' as const, color: '#1c1917' },
  menuCogs:        { fontSize: 14, fontWeight: '600' as const, color: '#b45309' },
  menuMargin:      { fontSize: 14, fontWeight: '700' as const },
  menuMarginNone:  { fontSize: 14, color: '#a8a29e' },

  inactiveBadge:     { backgroundColor: '#f5f5f4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, color: '#78716c' },

  actionBtn: { padding: 8 },

  addButtonContainer: {
    position: 'absolute' as const, bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#fafaf9', borderTopWidth: 1, borderTopColor: '#f5f5f4',
  },
  addButton: {
    backgroundColor: '#92400e', borderRadius: 16, paddingVertical: 14,
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
};
