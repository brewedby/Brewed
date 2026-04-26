/**
 * ProductCatalogScreen — Full-screen product legend + COGS editor.
 *
 * Presented as a React Native Modal from the Dashboard "Product Catalog" button
 * OR from a Settings row. This keeps the routing simple: no extra tab needed.
 *
 * INTEGRATION POINTS (during implementation):
 *   1. Dashboard: add a header button that sets showProductCatalog=true
 *   2. Settings: add a row "Product Catalog (COGS)" → same boolean state
 *   3. CogsSection: "Manage Products" link opens this screen
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Platform,
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

export function ProductCatalogScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: products = [], isLoading } = useProductCatalog();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [view, setView]               = useState<ScreenView>('list');
  const [editing, setEditing]         = useState<ProductCatalogItem | null>(null);
  const [search, setSearch]           = useState('');
  const [filterCategory, setFilter]   = useState<string>('all');

  const filtered = products.filter((p) => {
    const matchesSearch   = p.name.toLowerCase().includes(search.toLowerCase())
                         || (p.sku?.toLowerCase() ?? '').includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
      `Remove "${product.name}" from your catalog? Existing COGS calculations using this product won't change.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteProduct.mutate(product.id),
        },
      ],
    );
  }

  const totalCatalogCost = products.reduce((sum, p) => sum + p.unit_cost, 0);

  function renderItem({ item }: { item: ProductCatalogItem }) {
    const cat = PRODUCT_CATEGORIES.find((c) => c.value === item.category);
    return (
      <View style={styles.productRow}>
        <View style={styles.productEmoji}>
          <Text style={{ fontSize: 18 }}>{cat?.emoji ?? '📦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.productName}>{item.name}</Text>
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>inactive</Text>
              </View>
            )}
          </View>
          <Text style={styles.productMeta}>
            {cat?.label ?? item.category} · per {item.unit}
            {item.sku ? ` · SKU: ${item.sku}` : ''}
          </Text>
        </View>
        <Text style={styles.productCost}>£{item.unit_cost.toFixed(2)}</Text>
        <TouchableOpacity
          onPress={() => { setEditing(item); setView('edit'); }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
          style={{ padding: 8 }}
        >
          <Ionicons name="pencil-outline" size={16} color="#78716c" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}
          style={{ padding: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
        </TouchableOpacity>
      </View>
    );
  }

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
              <Text style={styles.title}>Product Catalog</Text>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close product catalog"
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
                accessibilityLabel="Back to product list"
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
                <Text style={styles.summaryValue}>{products.length}</Text>
                <Text style={styles.summaryLabel}>Products</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {products.filter((p) => p.is_active).length}
                </Text>
                <Text style={styles.summaryLabel}>Active</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {products.length > 0
                    ? `£${(totalCatalogCost / products.length).toFixed(2)}`
                    : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Avg COGS</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color="#a8a29e" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search products..."
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

            {/* Category filter pills */}
            <View style={styles.filterRow}>
              {[{ value: 'all', label: 'All', emoji: '🔎' }, ...PRODUCT_CATEGORIES].map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setFilter(cat.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Filter by ${cat.label}`}
                  accessibilityState={{ checked: filterCategory === cat.value }}
                  style={[styles.filterPill, filterCategory === cat.value && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, filterCategory === cat.value && { color: '#fff' }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Product list */}
            {isLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#92400e" />
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingTop: 60 }}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>🏷️</Text>
                    <Text style={{ fontWeight: '600', color: '#1c1917', fontSize: 16, marginBottom: 6 }}>
                      {search ? 'No matches' : 'No products yet'}
                    </Text>
                    <Text style={{ color: '#a8a29e', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
                      {search
                        ? 'Try a different search or clear the filter.'
                        : 'Add your menu items with their cost to make.\nBreweduses these to calculate COGS automatically.'}
                    </Text>
                  </View>
                }
                ListHeaderComponent={
                  filtered.length > 0 ? (
                    <Text style={styles.listCountLabel}>
                      {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                    </Text>
                  ) : null
                }
              />
            )}

            {/* Add button */}
            <View style={[styles.addButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                onPress={() => setView('add')}
                accessibilityRole="button"
                accessibilityLabel="Add new product to catalog"
                style={styles.addButton}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Product</Text>
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
  container:   { flex: 1, backgroundColor: '#fafaf9' },
  header: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f5f5f4',
  },
  title:       { fontSize: 18, fontWeight: '700' as const, color: '#1c1917' },
  closeButton: { padding: 4 },

  summaryStrip: {
    flexDirection: 'row' as const, backgroundColor: '#fff',
    paddingVertical: 12, paddingHorizontal: 20, gap: 0,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f4',
  },
  summaryItem:  { flex: 1, alignItems: 'center' as const },
  summaryValue: { fontSize: 18, fontWeight: '700' as const, color: '#92400e' },
  summaryLabel: { fontSize: 11, color: '#a8a29e', marginTop: 2 },

  searchRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1c1917' },

  filterRow: {
    flexDirection: 'row' as const, paddingHorizontal: 16, gap: 8,
    marginTop: 10, marginBottom: 4, flexWrap: 'wrap' as const,
  },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e7e5e4', backgroundColor: '#fff',
  },
  filterPillActive: { backgroundColor: '#1c1917', borderColor: '#1c1917' },
  filterPillText:   { fontSize: 12, color: '#57534e', fontWeight: '500' as const },

  listCountLabel: { fontSize: 12, color: '#a8a29e', marginTop: 12, marginBottom: 4 },

  productRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#f5f5f4',
    gap: 10,
  },
  productEmoji: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef3c7',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  productName: { fontSize: 14, fontWeight: '600' as const, color: '#1c1917' },
  productMeta: { fontSize: 11, color: '#a8a29e', marginTop: 1 },
  productCost: { fontSize: 15, fontWeight: '700' as const, color: '#92400e', minWidth: 52, textAlign: 'right' as const },
  inactiveBadge: { backgroundColor: '#f5f5f4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, color: '#78716c' },

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
