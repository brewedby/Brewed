import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import { useSalesLineItems } from '@/lib/queries/salesReports';
import { useAssignProduct, useApplyCogs, useDeleteSalesReport } from '@/lib/mutations/salesReports';
import type {
  SalesReport, SalesLineItemWithProduct, ProductCatalogItem,
} from '@/types/cogs';
import { getCategoryDefinition } from '@/types/cogs';

interface Props {
  report: SalesReport;
  eventId: string;
  existingCogs: number;
  onCogsApplied: () => void;
  onDeleted: () => void;
}

export function SalesReconciliation({ report, eventId, existingCogs, onCogsApplied, onDeleted }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { data: lineItems = [], isLoading } = useSalesLineItems(report.id);
  const { data: catalog = [] } = useProductCatalog();
  const assignProduct = useAssignProduct();
  const applyCogs = useApplyCogs();
  const deleteReport = useDeleteSalesReport();

  const [assigningItem, setAssigningItem] = useState<SalesLineItemWithProduct | null>(null);
  const [expanded, setExpanded] = useState(true);

  const calculatedCogs = report.calculated_cogs;
  const discrepancy = Math.abs(calculatedCogs - existingCogs);
  const hasDiscrepancy = existingCogs > 0 && discrepancy > 0.5;

  function handleApply() {
    Alert.alert(
      'Apply Calculated COGS',
      `Update cost of goods to £${calculatedCogs.toFixed(2)}?\n\nThis will replace the current value of £${existingCogs.toFixed(2)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await applyCogs.mutateAsync({ eventId, calculatedCogs });
              onCogsApplied();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not apply COGS. Please try again.');
            }
          },
        },
      ],
    );
  }

  function handleDelete() {
    Alert.alert(
      'Remove Report',
      'Remove this sales report and all its line items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => { deleteReport.mutate({ reportId: report.id, eventId }); onDeleted(); },
        },
      ],
    );
  }

  async function handleAssign(product: ProductCatalogItem) {
    if (!assigningItem) return;
    try {
      await assignProduct.mutateAsync({
        lineItemId: assigningItem.id,
        product,
        quantity: assigningItem.quantity,
        reportId: report.id,
      });
      setAssigningItem(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not assign product. Please try again.');
    }
  }

  function renderLineItem({ item }: { item: SalesLineItemWithProduct }) {
    const cat = item.product_catalog?.category
      ? getCategoryDefinition(item.product_catalog.category)
      : null;

    return (
      <View style={[
        {
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 14, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: p.border, gap: 8,
        },
        !item.is_matched && { backgroundColor: p.surfaceAlt },
      ]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {cat && <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>}
            <Text style={{ fontSize: 13, fontWeight: '600', color: p.text }} numberOfLines={1}>
              {item.product_name}
            </Text>
          </View>
          {item.is_matched && item.product_catalog && (
            <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>
              → {item.product_catalog.name}
              {item.is_manually_assigned ? ' (manual)' : ` (${Math.round((item.match_confidence ?? 0) * 100)}% match)`}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ fontSize: 13, color: p.textMuted, fontVariant: ['tabular-nums'] }}>
            ×{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
          </Text>
          {item.is_matched && item.cogs_calculated != null ? (
            <Text style={{ fontSize: 15, fontWeight: '700', color: p.brand, fontVariant: ['tabular-nums'] }}>
              £{item.cogs_calculated.toFixed(2)}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => setAssigningItem(item)}
              accessibilityRole="button"
              accessibilityLabel={`Assign product to ${item.product_name}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                backgroundColor: p.brandSoft, paddingHorizontal: 8, paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '600' }}>Assign</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const matchedCount = lineItems.filter((i) => i.is_matched).length;
  const coveragePct = lineItems.length > 0 ? Math.round((matchedCount / lineItems.length) * 100) : 0;

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, marginBottom: 12, overflow: 'hidden' }}>
      {/* Report header */}
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} sales report`}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: p.text }} numberOfLines={1}>
            {report.file_name}
          </Text>
          <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>
            {matchedCount}/{report.total_line_items} matched · {coveragePct}% coverage
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: p.textFaint }}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Summary row */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, gap: 0, marginBottom: 8, borderTopWidth: 1, borderTopColor: p.border }}>
            <View style={{ flex: 1, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: p.text, fontVariant: ['tabular-nums'] }}>
                £{report.total_revenue_from_file.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenue</Text>
            </View>
            <View style={{ width: 1, backgroundColor: p.border }} />
            <View style={{ flex: 1, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: p.brand, fontVariant: ['tabular-nums'] }}>
                £{calculatedCogs.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Calc. COGS</Text>
            </View>
            <View style={{ width: 1, backgroundColor: p.border }} />
            <View style={{ flex: 1, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: calculatedCogs > 0 && report.total_revenue_from_file > 0 ? '#22c55e' : p.textFaint }}>
                {report.total_revenue_from_file > 0
                  ? `${Math.round((1 - calculatedCogs / report.total_revenue_from_file) * 100)}%`
                  : '—'}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Margin</Text>
            </View>
          </View>

          {/* Discrepancy alert */}
          {hasDiscrepancy && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: p.surfaceAlt, marginHorizontal: 14, marginBottom: 8,
              padding: 10, borderWidth: 1, borderColor: p.brand,
            }}>
              <Text style={{ fontSize: 13, color: p.brand }}>!</Text>
              <Text style={{ flex: 1, fontSize: 12, color: p.textMuted }}>
                Manual COGS (£{existingCogs.toFixed(2)}) differs by £{discrepancy.toFixed(2)} from calculated.
              </Text>
            </View>
          )}

          {/* Line items */}
          {isLoading ? (
            <ActivityIndicator color={p.brand} style={{ marginVertical: 16 }} />
          ) : (
            <FlatList
              data={lineItems}
              keyExtractor={(item) => item.id}
              renderItem={renderLineItem}
              scrollEnabled={false}
              style={{ marginTop: 4 }}
            />
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: p.border, marginTop: 4 }}>
            <TouchableOpacity
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Remove this sales report"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingVertical: 10, paddingHorizontal: 14,
                borderWidth: 1, borderColor: '#dc2626',
              }}
            >
              <Text style={{ fontSize: 13, color: '#dc2626' }}>✕</Text>
              <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '500' }}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              disabled={applyCogs.isPending || calculatedCogs === 0}
              accessibilityRole="button"
              accessibilityLabel="Apply calculated COGS to event"
              style={[
                {
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, backgroundColor: p.text, paddingVertical: 12,
                },
                (calculatedCogs === 0 || applyCogs.isPending) && { opacity: 0.5 },
              ]}
            >
              {applyCogs.isPending ? (
                <ActivityIndicator color={p.bg} size="small" />
              ) : (
                <Text style={{ color: p.bg, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
                  APPLY £{calculatedCogs.toFixed(2)} TO EVENT
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Assign product modal */}
      <Modal
        visible={!!assigningItem}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setAssigningItem(null)}
      >
        <View style={{ flex: 1, padding: 20, backgroundColor: p.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 2, borderBottomColor: p.text, paddingBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: p.text }}>
              Assign: "{assigningItem?.product_name}"
            </Text>
            <TouchableOpacity onPress={() => setAssigningItem(null)} accessibilityLabel="Close">
              <Text style={{ fontSize: 20, color: p.text }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: p.textMuted, fontSize: 13, marginBottom: 12 }}>
            Which product in your catalog does this match?
          </Text>
          <FlatList
            data={catalog.filter((prod) => prod.is_active)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const cat = getCategoryDefinition(item.category);
              return (
                <TouchableOpacity
                  onPress={() => handleAssign(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign to ${item.name}`}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 14,
                    borderWidth: 1, borderColor: p.border,
                    backgroundColor: p.surface, marginBottom: 8, gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{cat?.emoji ?? '☕'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: p.text }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: p.textFaint }}>
                      £{item.unit_cost.toFixed(2)} per {item.unit}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: p.textFaint }}>›</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: p.textFaint, textAlign: 'center', marginTop: 40 }}>
                No active products in catalog
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
