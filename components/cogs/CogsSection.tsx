import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';
import { useAuth } from '@/lib/auth';
import { useProductCatalog } from '@/lib/queries/productCatalog';
import { useSalesReports } from '@/lib/queries/salesReports';
import { useParseSalesReport, useSaveImportedReport } from '@/lib/mutations/salesReports';
import { useFeature } from '@/lib/iap/SubscriptionContext';
import { SalesReconciliation } from './SalesReconciliation';
import { ProductCatalogScreen } from './ProductCatalogScreen';
import { ImportReviewModal } from './ImportReviewModal';
import type { SalesReport, PendingImportData } from '@/types/cogs';

interface Props {
  eventId: string;
  existingCogs: number;
}

export function CogsSection({ eventId, existingCogs }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { user } = useAuth();
  const router = useRouter();
  const { data: catalog = [] } = useProductCatalog();
  const { data: reports = [], isLoading: reportsLoading } = useSalesReports(eventId);
  const parseReport = useParseSalesReport();
  const saveReport = useSaveImportedReport();
  const pdfImport = useFeature('pdf_import');

  const [showCatalog, setShowCatalog] = useState(false);
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImportData | null>(null);

  const visibleReports: SalesReport[] = reports.filter((r) => r.id !== deletedId);

  async function handleUpload() {
    if (!user) return;
    if (catalog.length === 0) {
      Alert.alert(
        'Set up your Product Catalog first',
        'Add your menu items and their costs in the Product Catalog before uploading a sales report.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Catalog', onPress: () => setShowCatalog(true) },
        ],
      );
      return;
    }
    try {
      const result = await parseReport.mutateAsync({
        eventId,
        catalog,
        existingReportCount: visibleReports.length,
      });
      // PDF item-level import is a Pro feature. The file was parsed locally
      // and nothing was saved — offer the upgrade rather than the review.
      if (result.sourceFormat === 'pdf' && !pdfImport.allowed) {
        Alert.alert(
          'PDF import is a Brewed Pro feature',
          'We read the file on your device and nothing was saved. Upgrade to Brewed Pro to import item-level PDF reports — or export a CSV from your EPOS, which is included in your plan.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/(modal)/paywall') },
          ],
        );
        return;
      }
      setPending(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      if (msg !== 'No file selected') Alert.alert('Error', msg);
    }
  }

  async function handleConfirmImport() {
    if (!pending || !user) return;
    try {
      await saveReport.mutateAsync({ pending, eventId, userId: user.id });
      setPending(null);
      router.replace(`/(tabs)/events/${eventId}`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save the report. Please try again.');
    }
  }

  function handleCancelImport() {
    setPending(null);
  }

  const latestCalcCogs = visibleReports[0]?.calculated_cogs ?? 0;
  const hasMismatch = existingCogs > 0 && latestCalcCogs > 0
    && Math.abs(latestCalcCogs - existingCogs) > 0.5;

  const isProcessing = parseReport.isPending || saveReport.isPending;

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase' }}>
            Sales Report Import
          </Text>
          <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 3 }}>
            Import your POS items-sold report. Matches against your catalog and calculates COGS for you.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCatalog(true)}
          accessibilityRole="button"
          accessibilityLabel="Manage product catalog"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            borderWidth: 1, borderColor: p.border, backgroundColor: p.surface,
            paddingHorizontal: 10, paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 11 }}>⊞</Text>
          <Text style={{ fontSize: 12, color: p.textMuted, fontWeight: '600' }}>Products</Text>
        </TouchableOpacity>
      </View>

      {/* Mismatch banner */}
      {hasMismatch && (
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: p.surface, padding: 10,
          borderWidth: 1, borderColor: p.brand, marginBottom: 10,
        }}>
          <Text style={{ fontSize: 13, color: p.brand }}>!</Text>
          <Text style={{ flex: 1, fontSize: 12, color: p.textMuted, lineHeight: 18 }}>
            Manually entered COGS (£{existingCogs.toFixed(2)}) differs from calculated (£{latestCalcCogs.toFixed(2)}). Review below and tap Apply if correct.
          </Text>
        </View>
      )}

      {/* Upload button */}
      <TouchableOpacity
        onPress={handleUpload}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel="Import sales report CSV or PDF"
        style={[
          {
            flexDirection: 'row', alignItems: 'center', gap: 12,
            borderWidth: 1, borderColor: p.border, borderStyle: 'dashed',
            padding: 14, backgroundColor: p.surface, marginBottom: 10,
          },
          isProcessing && { opacity: 0.6 },
        ]}
      >
        {isProcessing ? (
          <>
            <ActivityIndicator color={p.brand} size="small" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: p.textMuted }}>
              {parseReport.isPending ? 'Reading file…' : 'Saving…'}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 18, color: p.brand }}>↑</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: p.text }}>Import sales report</Text>
              <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>CSV or PDF · Processed locally on your device</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Catalog nudge if empty */}
      {catalog.length === 0 && (
        <View style={{
          backgroundColor: p.surface, padding: 12,
          borderWidth: 1, borderColor: p.border, marginBottom: 10, gap: 4,
        }}>
          <Text style={{ fontSize: 12, color: p.textMuted, lineHeight: 18 }}>
            Add products to your catalog first so Brewed can match them automatically.
          </Text>
          <TouchableOpacity onPress={() => setShowCatalog(true)} accessibilityRole="button">
            <Text style={{ fontSize: 12, color: p.brand, fontWeight: '700' }}>Open Catalog →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reports list */}
      {reportsLoading ? (
        <ActivityIndicator color={p.brand} style={{ marginTop: 12 }} />
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

      <ProductCatalogScreen
        visible={showCatalog}
        onClose={() => setShowCatalog(false)}
      />

      {/* Review modal — shown before saving, gives user full visibility */}
      <ImportReviewModal
        pending={pending}
        isSaving={saveReport.isPending}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />
    </View>
  );
}
