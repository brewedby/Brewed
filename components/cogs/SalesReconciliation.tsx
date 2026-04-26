/**
 * SalesReconciliation — shows parsed line items, matched vs. unmatched,
 * COGS breakdown, discrepancy alert, and "Apply to Event" CTA.
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import { useSalesLineItems } from '@/lib/queries/salesReports';
import { useAssignProduct, useApplyCogs, useDeleteSalesReport } from '@/lib/mutations/salesReports';
import type {
  SalesReport, SalesLineItemWithProduct, ProductCatalogItem,
} from '@/types/cogs';
import { PRODUCT_CATEGORIES } from '@/types/cogs';

interface Props {
  report: SalesReport;
  eventId: string;
  existingCogs: number;         // event_financials.cost_of_goods entered manually
  onCogsApplied: () => void;    // callback after Apply is confirmed
  onDeleted: () => void;
}

export function SalesReconciliation({ report, eventId, existingCogs, onCogsApplied, onDeleted }: Props) {
  const { data: lineItems = [], isLoading } = useSalesLineItems(report.id);
  const { data: catalog = [] } = useProductCatalog();
  const assignProduct = useAssignProduct();
  const applyCogs     = useApplyCogs();
  const deleteReport  = useDeleteSalesReport();

  const [assigningItem, setAssigningItem] = useState<SalesLineItemWithProduct | null>(null);
  const [expanded, setExpanded]           = useState(true);

  const calculatedCogs = report.calculated_cogs;
  const discrepancy    = Math.abs(calculatedCogs - existingCogs);
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
            await applyCogs.mutateAsync({ eventId, calculatedCogs });
            onCogsApplied();
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
    await assignProduct.mutateAsync({
      lineItemId: assigningItem.id,
      product,
      quantity: assigningItem.quantity,
      reportId: report.id,
    });
    setAssigningItem(null);
  }

  function renderLineItem({ item }: { item: SalesLineItemWithProduct }) {
    const cat = item.product_catalog
      ? PRODUCT_CATEGORIES.find((c) => c.value === item.product_catalog?.category)
      : null;

    return (
      <View style={[itemStyles.row, !item.is_matched && itemStyles.rowUnmatched]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {cat && <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>}
            <Text style={itemStyles.productName} numberOfLines={1}>
              {item.product_name}
            </Text>
          </View>
          {item.is_matched && item.product_catalog && (
            <Text style={itemStyles.matchedName}>
              → {item.product_catalog.name}
              {item.is_manually_assigned ? ' (manual)' : ` (${Math.round((item.match_confidence ?? 0) * 100)}% match)`}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={itemStyles.qty}>×{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}</Text>
          {item.is_matched && item.cogs_calculated != null ? (
            <Text style={itemStyles.cogs}>£{item.cogs_calculated.toFixed(2)}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => setAssigningItem(item)}
              accessibilityRole="button"
              accessibilityLabel={`Assign product to ${item.product_name}`}
              style={itemStyles.assignButton}
            >
              <Ionicons name="link-outline" size={11} color="#92400e" />
              <Text style={itemStyles.assignText}>Assign</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const matchedCount  = lineItems.filter((i) => i.is_matched).length;
  const coveragePct   = lineItems.length > 0 ? Math.round((matchedCount / lineItems.length) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Report header */}
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} sales report`}
        style={styles.reportHeader}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.fileName} numberOfLines={1}>{report.file_name}</Text>
          <Text style={styles.fileMeta}>
            {matchedCount}/{report.total_line_items} matched · {coveragePct}% coverage
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16} color="#78716c"
        />
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>£{report.total_revenue_from_file.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Revenue (file)</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#92400e' }]}>
                £{calculatedCogs.toFixed(2)}
              </Text>
              <Text style={styles.summaryLabel}>Calc. COGS</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, {
                color: calculatedCogs > 0 && report.total_revenue_from_file > 0
                  ? '#16a34a' : '#a8a29e',
              }]}>
                {report.total_revenue_from_file > 0
                  ? `${Math.round((1 - calculatedCogs / report.total_revenue_from_file) * 100)}%`
                  : '—'}
              </Text>
              <Text style={styles.summaryLabel}>Gross margin</Text>
            </View>
          </View>

          {/* Discrepancy alert */}
          {hasDiscrepancy && (
            <View style={styles.discrepancyAlert}>
              <Ionicons name="warning-outline" size={16} color="#b45309" />
              <Text style={styles.discrepancyText}>
                Manual COGS (£{existingCogs.toFixed(2)}) differs by £{discrepancy.toFixed(2)} from calculated.
              </Text>
            </View>
          )}

          {/* Line items */}
          {isLoading ? (
            <ActivityIndicator color="#92400e" style={{ marginVertical: 16 }} />
          ) : (
            <FlatList
              data={lineItems}
              keyExtractor={(item) => item.id}
              renderItem={renderLineItem}
              scrollEnabled={false}
              style={{ marginTop: 8 }}
            />
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Remove this sales report"
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={14} color="#dc2626" />
              <Text style={styles.deleteText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              disabled={applyCogs.isPending || calculatedCogs === 0}
              accessibilityRole="button"
              accessibilityLabel="Apply calculated COGS to event"
              style={[styles.applyButton, (calculatedCogs === 0 || applyCogs.isPending) && { opacity: 0.5 }]}
            >
              {applyCogs.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.applyText}>Apply £{calculatedCogs.toFixed(2)} to Event</Text>
                </>
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
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1917' }}>
              Assign: "{assigningItem?.product_name}"
            </Text>
            <TouchableOpacity onPress={() => setAssigningItem(null)} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color="#1c1917" />
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#78716c', fontSize: 13, marginBottom: 12 }}>
            Which product in your catalog does this match?
          </Text>
          <FlatList
            data={catalog.filter((p) => p.is_active)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const cat = PRODUCT_CATEGORIES.find((c) => c.value === item.category);
              return (
                <TouchableOpacity
                  onPress={() => handleAssign(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign to ${item.name}`}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 14,
                    borderRadius: 12, borderWidth: 1, borderColor: '#f5f5f4',
                    backgroundColor: '#fff', marginBottom: 8, gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{cat?.emoji ?? '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#1c1917' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#a8a29e' }}>£{item.unit_cost.toFixed(2)} per {item.unit}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#a8a29e" />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: '#a8a29e', textAlign: 'center', marginTop: 40 }}>
                No active products in catalog
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  container:      { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f5f5f4', overflow: 'hidden' as const },
  reportHeader:   { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, gap: 8 },
  fileName:       { fontSize: 14, fontWeight: '600' as const, color: '#1c1917' },
  fileMeta:       { fontSize: 11, color: '#78716c', marginTop: 2 },
  summaryRow:     { flexDirection: 'row' as const, paddingHorizontal: 14, gap: 8, marginBottom: 8 },
  summaryCard:    { flex: 1, backgroundColor: '#fafaf9', borderRadius: 12, padding: 10, alignItems: 'center' as const },
  summaryValue:   { fontSize: 15, fontWeight: '700' as const, color: '#1c1917' },
  summaryLabel:   { fontSize: 10, color: '#a8a29e', marginTop: 2 },
  discrepancyAlert: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    backgroundColor: '#fef9c3', marginHorizontal: 14, marginBottom: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  discrepancyText: { flex: 1, fontSize: 12, color: '#92400e' },
  actionRow:    { flexDirection: 'row' as const, padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#f5f5f4', marginTop: 4 },
  deleteButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
  deleteText:   { fontSize: 13, color: '#dc2626', fontWeight: '500' as const },
  applyButton:  { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, backgroundColor: '#92400e', paddingVertical: 12, borderRadius: 12 },
  applyText:    { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
};

const itemStyles = {
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#fafaf9', gap: 8,
  },
  rowUnmatched: { backgroundColor: '#fffbeb' },
  productName:  { fontSize: 13, fontWeight: '600' as const, color: '#1c1917' },
  matchedName:  { fontSize: 11, color: '#78716c', marginTop: 1 },
  qty:          { fontSize: 12, color: '#78716c' },
  cogs:         { fontSize: 14, fontWeight: '700' as const, color: '#92400e' },
  assignButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  assignText:   { fontSize: 11, color: '#92400e', fontWeight: '600' as const },
};
