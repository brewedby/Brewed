/**
 * CogsSection — embeds into the event detail screen after InfrastructureList.
 *
 * IMPLEMENTATION: add <CogsSection eventId={event.id} existingCogs={...} />
 * in app/(tabs)/events/[id]/index.tsx after the DocumentsSection.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import { useSalesReports } from '@/lib/queries/salesReports';
import { useUploadSalesReport } from '@/lib/mutations/salesReports';
import { SalesReconciliation } from './SalesReconciliation';
import { ProductCatalogScreen } from './ProductCatalogScreen';
import type { SalesReport } from '@/types/cogs';

interface Props {
  eventId: string;
  existingCogs: number;
}

export function CogsSection({ eventId, existingCogs }: Props) {
  const { user } = useAuth();
  const router   = useRouter();
  const { data: catalog = [] }  = useProductCatalog();
  const { data: reports = [], isLoading: reportsLoading } = useSalesReports(eventId);
  const uploadReport = useUploadSalesReport();

  const [showCatalog, setShowCatalog] = useState(false);
  const [deletedId, setDeletedId]     = useState<string | null>(null);

  const visibleReports: SalesReport[] = reports.filter((r) => r.id !== deletedId);

  async function handleUpload() {
    if (!user) return;
    if (catalog.length === 0) {
      Alert.alert(
        'Set up your Product Catalog first',
        'Add your menu items and their costs in the Product Catalog before uploading a sales report. This lets Brewed calculate COGS automatically.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Catalog', onPress: () => setShowCatalog(true) },
        ],
      );
      return;
    }
    try {
      await uploadReport.mutateAsync({ eventId, userId: user.id, catalog });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      if (msg !== 'No file selected') Alert.alert('Error', msg);
    }
  }

  const latestCalcCogs = visibleReports[0]?.calculated_cogs ?? 0;
  const hasMismatch    = existingCogs > 0 && latestCalcCogs > 0
                      && Math.abs(latestCalcCogs - existingCogs) > 0.5;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>COGS from Sales Report</Text>
          <Text style={styles.sectionSub}>Upload your POS export to calculate cost of goods accurately</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCatalog(true)}
          accessibilityRole="button"
          accessibilityLabel="Manage product catalog"
          style={styles.catalogButton}
        >
          <Ionicons name="pricetag-outline" size={14} color="#92400e" />
          <Text style={styles.catalogButtonText}>Products</Text>
        </TouchableOpacity>
      </View>

      {/* Mismatch banner (when report exists but differs from manual entry) */}
      {hasMismatch && (
        <View style={styles.mismatchBanner}>
          <Ionicons name="alert-circle-outline" size={15} color="#b45309" />
          <Text style={styles.mismatchText}>
            Your manually entered COGS (£{existingCogs.toFixed(2)}) differs from the calculated
            figure (£{latestCalcCogs.toFixed(2)}). Review the report below and tap Apply if correct.
          </Text>
        </View>
      )}

      {/* Upload button */}
      <TouchableOpacity
        onPress={handleUpload}
        disabled={uploadReport.isPending}
        accessibilityRole="button"
        accessibilityLabel="Upload sales report CSV or PDF"
        style={[styles.uploadButton, uploadReport.isPending && { opacity: 0.6 }]}
      >
        {uploadReport.isPending ? (
          <>
            <ActivityIndicator color="#92400e" size="small" />
            <Text style={styles.uploadText}>Processing…</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color="#92400e" />
            <View>
              <Text style={styles.uploadText}>Upload Sales Report</Text>
              <Text style={styles.uploadSub}>CSV or PDF · POS export</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Catalog nudge if empty */}
      {catalog.length === 0 && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            💡 Add products to your catalog first so Brewed can match them automatically.
          </Text>
          <TouchableOpacity
            onPress={() => setShowCatalog(true)}
            accessibilityRole="button"
            accessibilityLabel="Open product catalog"
          >
            <Text style={styles.nudgeLink}>Open Catalog →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reports list */}
      {reportsLoading ? (
        <ActivityIndicator color="#92400e" style={{ marginTop: 12 }} />
      ) : (
        visibleReports.map((report) => (
          <SalesReconciliation
            key={report.id}
            report={report}
            eventId={eventId}
            existingCogs={existingCogs}
            onCogsApplied={() => router.replace(`/(tabs)/events/${eventId}`)}
            onDeleted={() => setDeletedId(report.id)}
          />
        ))
      )}

      {/* Product catalog modal */}
      <ProductCatalogScreen
        visible={showCatalog}
        onClose={() => setShowCatalog(false)}
      />
    </View>
  );
}

const styles = {
  container:      { marginBottom: 16 },
  sectionHeader:  { flexDirection: 'row' as const, alignItems: 'flex-start' as const, marginBottom: 10, gap: 10 },
  sectionTitle:   { fontSize: 14, fontWeight: '700' as const, color: '#1c1917' },
  sectionSub:     { fontSize: 11, color: '#a8a29e', marginTop: 2 },
  catalogButton:  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  catalogButtonText: { fontSize: 12, color: '#92400e', fontWeight: '600' as const },
  mismatchBanner: {
    flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8,
    backgroundColor: '#fef9c3', padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 10,
  },
  mismatchText:   { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
  uploadButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
    borderWidth: 1.5, borderColor: '#d97706', borderRadius: 14, borderStyle: 'dashed' as const,
    padding: 14, backgroundColor: '#fffbeb', marginBottom: 10,
  },
  uploadText:   { fontSize: 14, fontWeight: '600' as const, color: '#92400e' },
  uploadSub:    { fontSize: 11, color: '#b45309', marginTop: 1 },
  nudge: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 10,
    gap: 4,
  },
  nudgeText: { fontSize: 12, color: '#15803d', lineHeight: 18 },
  nudgeLink: { fontSize: 12, color: '#15803d', fontWeight: '700' as const },
};
