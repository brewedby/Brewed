import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/themeContext';
import { useAuth } from '@/lib/auth';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useRecategorizeProducts,
} from '@/lib/mutations/productCatalog';
import { ProductForm } from './ProductForm';
import {
  getCategoriesForTrade,
  getCategoryDefinition,
  isProductVatable,
  mapLegacyCategoryForTrade,
  type ProductCatalogItem,
} from '@/types/cogs';
import type { ProductFormValues } from '@/lib/validations/product.schema';
import { useTraderProfile } from '@/lib/queries/traderProfile';

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
  // Shared trader profile resolver — caches last-known-good in
  // AsyncStorage so a transient fetch failure (network blip, JWT race
  // post sign-in, RLS hiccup) doesn't lock the user out of their menu.
  // Status: 'loading' | 'ready' | 'incomplete' | 'error'.
  const trader = useTraderProfile();
  const { data: products = [], isLoading } = useProductCatalog();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const recategorizeProducts = useRecategorizeProducts();

  const [view, setView] = useState<ScreenView>('list');
  const [editing, setEditing] = useState<ProductCatalogItem | null>(null);
  const [search, setSearch] = useState('');

  // The resolver guarantees `tradeType` is canonical and only resolves
  // to 'Other' when the profile is genuinely empty (status='incomplete')
  // or pre-auth. The early-return gates below keep the list / picker
  // UI from rendering during 'loading' / 'error' / 'incomplete' states.
  const tradeType = trader.tradeType;
  const profileReady = trader.status === 'ready';

  const filtered = useMemo(() =>
    products.filter((prod) =>
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      (prod.sku?.toLowerCase() ?? '').includes(search.toLowerCase())
    ),
    [products, search],
  );

  // Sections are built from the trade-specific category list, plus any
  // legacy categories not in the list (so historic data still renders).
  const tradeCatKeys = useMemo(
    () => new Set(getCategoriesForTrade(tradeType).map((c) => c.value)),
    [tradeType],
  );
  const sections = useMemo(() => {
    const tradeCats = getCategoriesForTrade(tradeType);
    const legacyKeys = Array.from(new Set(filtered.map((p) => p.category).filter((k) => !tradeCatKeys.has(k))));
    const allCats = [...tradeCats, ...legacyKeys.map((k) => getCategoryDefinition(k))];
    return allCats
      .map((cat) => ({ category: cat, data: filtered.filter((prod) => prod.category === cat.value) }))
      .filter((s) => s.data.length > 0);
  }, [filtered, tradeType, tradeCatKeys]);

  // Number of products whose category is NOT in the current trade's list —
  // surfaces a one-time prompt to re-categorise legacy data after the
  // trade-aware categories shipped.
  const legacyCount = useMemo(
    () => products.filter((p) => !tradeCatKeys.has(p.category)).length,
    [products, tradeCatKeys],
  );

  // Auto-fix all legacy categories in one tap. Map each legacy product
  // to the closest modern category for the active trade, then bulk-update.
  // Confirmation alert first because this writes to every legacy row.
  function handleAutoFixLegacy() {
    const legacy = products.filter((prod) => !tradeCatKeys.has(prod.category));
    if (legacy.length === 0) return;
    const mappings = legacy.map((prod) => ({
      id: prod.id,
      newCategory: mapLegacyCategoryForTrade(prod.category, tradeType),
    }));
    Alert.alert(
      'Auto-fix categories?',
      `Move ${legacy.length} legacy product${legacy.length === 1 ? '' : 's'} into the matching ${tradeType} categories. You can still edit any product afterwards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Auto-fix',
          onPress: async () => {
            try {
              await recategorizeProducts.mutateAsync({ mappings });
            } catch (e) {
              Alert.alert(
                'Auto-fix failed',
                e instanceof Error ? e.message : 'Some products could not be updated. Please try again.',
              );
            }
          },
        },
      ],
    );
  }

  async function handleAdd(values: ProductFormValues) {
    if (!user) return;
    try {
      await createProduct.mutateAsync({ data: values, userId: user.id });
      setView('list');
    } catch (e) {
      Alert.alert(
        'Could not save product',
        e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      );
    }
  }

  async function handleEdit(values: ProductFormValues) {
    if (!editing) return;
    try {
      await updateProduct.mutateAsync({ id: editing.id, data: values });
      setEditing(null);
      setView('list');
    } catch (e) {
      Alert.alert(
        'Could not save changes',
        e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      );
    }
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
      // Use first tier (default) price for the summary margin
      const defaultPrice = prod.price_tiers?.[0]?.price ?? prod.selling_price;
      const netPrice = isProductVatable(prod) ? defaultPrice / 1.2 : defaultPrice;
      return sum + ((netPrice - prod.unit_cost) / netPrice) * 100;
    }, 0) / withPrice.length;
    return avg;
  }, [products]);

  function renderProduct({ item }: { item: ProductCatalogItem }) {
    const isVatable = isProductVatable(item);
    const tiers = item.price_tiers?.length ? item.price_tiers : [{ label: 'Standard', price: item.selling_price }];
    const defaultPrice = tiers[0].price;
    const netDefaultPrice = isVatable ? defaultPrice / 1.2 : defaultPrice;
    const grossMargin = defaultPrice > 0
      ? ((netDefaultPrice - item.unit_cost) / netDefaultPrice) * 100
      : null;

    return (
      <View style={{
        backgroundColor: p.surface, borderWidth: 1, borderColor: p.border,
        padding: 12, marginBottom: 6,
      }}>
        {/* Top row: name + edit/delete */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: p.text }}>{item.name}</Text>
              {!item.is_active && (
                <View style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, color: p.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>inactive</Text>
                </View>
              )}
            </View>
            {item.sku ? <Text style={{ fontSize: 10, color: p.textFaint }}>SKU: {item.sku}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row' }}>
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

        {/* Price tiers row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {tiers.map((tier, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                borderWidth: 1,
                borderColor: i === 0 ? p.borderStrong : p.border,
                paddingHorizontal: 8, paddingVertical: 4,
                backgroundColor: i === 0 ? p.surfaceAlt : 'transparent',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: p.textFaint, textTransform: 'uppercase' }}>
                {tier.label}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: p.text }}>
                £{tier.price.toFixed(2)}
              </Text>
              {isVatable && i === 0 && (
                <Text style={{ fontSize: 8, color: p.textFaint }}>inc.VAT</Text>
              )}
            </View>
          ))}
        </View>

        {/* COGS | Margin strip */}
        <View style={{
          flexDirection: 'row', borderTopWidth: 1, borderTopColor: p.border,
          paddingTop: 8, gap: 0,
        }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: p.textFaint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>COGS</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: p.brand }}>£{item.unit_cost.toFixed(2)}</Text>
          </View>
          <View style={{ width: 1, backgroundColor: p.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: p.textFaint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
              Margin{tiers.length > 1 ? ' (default)' : ''}
            </Text>
            {grossMargin !== null ? (
              <Text style={{ fontSize: 13, fontWeight: '700', color: marginColor(grossMargin, p.brand) }}>
                {grossMargin.toFixed(0)}%{isVatable ? ' ex-VAT' : ''}
              </Text>
            ) : (
              <Text style={{ fontSize: 13, color: p.textFaint }}>—</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  function renderSectionHeader({ section }: { section: { category: { value: string; label: string; emoji: string }; data: ProductCatalogItem[] } }) {
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
    <View style={{ paddingHorizontal: 2, paddingTop: 14, paddingBottom: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: p.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Products — prices, COGS &amp; margin per item
      </Text>
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

        {trader.status === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={p.brand} />
          </View>
        ) : trader.status === 'error' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text, marginBottom: 6 }}>
              Couldn’t load your trader profile
            </Text>
            <Text style={{ color: p.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 8 }}>
              {trader.error?.message ?? 'Your trade type drives which categories appear here. Try again.'}
            </Text>
            <TouchableOpacity
              onPress={() => trader.retry()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading your trader profile"
              style={{ borderWidth: 1, borderColor: p.brand, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.brand }}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : trader.status === 'incomplete' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
            <Text style={{ fontFamily: tokens.type.display, fontSize: 22, color: p.text, marginBottom: 6 }}>
              Pick your trade type first
            </Text>
            <Text style={{ color: p.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 8 }}>
              Set your trade type in Settings and Menu &amp; COGS will show the matching categories — Hot Drinks, Cold Drinks, Bakes for Coffee, Mains/Sides/Drinks for food traders, and so on.
            </Text>
          </View>
        ) : view === 'list' && (
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

            {/* Legacy category prompt — appears when products use categories
                that aren't in the current trade type's list. Auto-fix maps
                each legacy category to the closest modern one for the
                active trade and bulk-updates; the user can still ✎ any
                product individually afterwards. */}
            {legacyCount > 0 && (
              <View style={{
                marginHorizontal: 16, marginBottom: 8,
                paddingHorizontal: 12, paddingVertical: 10,
                borderWidth: 1, borderColor: p.brand,
                backgroundColor: p.surfaceAlt,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.brand, textTransform: 'uppercase', marginBottom: 4 }}>
                  ● Re-categorise reminder
                </Text>
                <Text style={{ fontSize: 12, color: p.textMuted, lineHeight: 17, marginBottom: 10 }}>
                  {legacyCount === 1
                    ? `1 product uses a legacy category. Auto-fix moves it into the right ${tradeType} category, or tap ✎ to pick manually.`
                    : `${legacyCount} products use legacy categories. Auto-fix moves them into the right ${tradeType} categories, or tap ✎ on each to pick manually.`}
                </Text>
                <TouchableOpacity
                  onPress={handleAutoFixLegacy}
                  disabled={recategorizeProducts.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Auto-fix ${legacyCount} legacy categories`}
                  accessibilityState={{ disabled: recategorizeProducts.isPending }}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    borderWidth: 1, borderColor: p.brand,
                    paddingHorizontal: 12, paddingVertical: 6,
                    minHeight: 32,
                    opacity: recategorizeProducts.isPending ? 0.5 : 1,
                  }}
                >
                  {recategorizeProducts.isPending
                    ? <ActivityIndicator color={p.brand} size="small" />
                    : <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.brand }}>
                        AUTO-FIX ALL
                      </Text>}
                </TouchableOpacity>
              </View>
            )}

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

        {profileReady && view === 'add' && (
          <ProductForm
            onSubmit={handleAdd}
            onCancel={() => setView('list')}
            submitting={createProduct.isPending}
            tradeType={tradeType}
          />
        )}

        {profileReady && view === 'edit' && editing && (
          <ProductForm
            initial={editing}
            onSubmit={handleEdit}
            onCancel={() => { setEditing(null); setView('list'); }}
            submitting={updateProduct.isPending}
            tradeType={tradeType}
          />
        )}
      </View>
    </Modal>
  );
}
