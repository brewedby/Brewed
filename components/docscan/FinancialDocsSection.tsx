import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { useAuth } from '@/lib/auth';
import { useFeature } from '@/lib/iap/SubscriptionContext';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { useFinancialDocuments, useFinancialLineItems } from '@/lib/queries/financialDocs';
import {
  useParseFinancialDocument, useSaveFinancialDocument, useDeleteFinancialDocument,
  type PendingFinancialImport,
} from '@/lib/mutations/financialDocs';
import { FinancialDocReviewModal } from './FinancialDocReviewModal';
import { calcVatPosition } from '@/lib/docscan/vat';
import { compareForecastToActual } from '@/lib/docscan/contract';
import { RECONCILIATION_LABELS, type ReconciliationStatus } from '@/lib/docscan/reconcile';
import { DOCUMENT_KIND_LABELS, LINE_CATEGORY_LABELS, type DocumentKind, type DocLineItem, type LineCategory } from '@/lib/docscan/model';

interface Props {
  eventId: string;
  eventName: string;
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${v < 0 ? '−' : ''}£${Math.abs(v).toFixed(2)}`;

/**
 * "Documents & payout" — financial document imports for an event:
 * settlement statements, deduction statements, fee invoices, contracts.
 * Pro feature (doc_scanner).
 */
export function FinancialDocsSection({ eventId, eventName }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { user } = useAuth();
  const scanner = useFeature('doc_scanner');

  const { data: docs = [], isLoading } = useFinancialDocuments(eventId);
  const { data: lineItems = [] } = useFinancialLineItems(eventId);
  const parseDoc = useParseFinancialDocument();
  const saveDoc = useSaveFinancialDocument();
  const deleteDoc = useDeleteFinancialDocument();

  const [pending, setPending] = useState<PendingFinancialImport | null>(null);

  const vatPosition = useMemo(() => {
    const outputVat = docs.reduce((max, d) => Math.max(max, d.sales_vat ?? 0), 0);
    const actualLines = lineItems.filter((l) => !l.is_forecast).map((l) => ({
      description: l.description,
      category: l.category as DocLineItem['category'],
      net: l.net, vat: l.vat, gross: l.gross,
      vatRate: l.vat_rate,
      vatTreatment: l.vat_treatment as DocLineItem['vatTreatment'],
      reclaimability: l.reclaimability as DocLineItem['reclaimability'],
      role: l.settlement_role as DocLineItem['role'],
      confidence: 'high' as const,
      sourceText: '',
    }));
    return calcVatPosition(outputVat, actualLines);
  }, [docs, lineItems]);

  const variance = useMemo(() => {
    const forecast = lineItems.filter((l) => l.is_forecast).map((l) => ({ category: l.category, gross: l.gross }));
    const actual = lineItems.filter((l) => !l.is_forecast && l.settlement_role !== 'informational')
      .map((l) => ({ category: l.category, gross: l.gross }));
    if (forecast.length === 0 || actual.length === 0) return [];
    return compareForecastToActual(forecast, actual);
  }, [lineItems]);

  async function handleImport() {
    if (!user) return;
    try {
      const result = await parseDoc.mutateAsync();
      setPending(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      if (msg !== 'No file selected') Alert.alert("Couldn't read the document", msg);
    }
  }

  async function handleConfirm(review: {
    lines: DocLineItem[];
    reportedPayout: number | null;
    userEdited: boolean;
    revisionKind: string | null;
    isForecast: boolean;
  }) {
    if (!pending || !user) return;
    try {
      await saveDoc.mutateAsync({
        pending,
        lines: review.lines,
        reportedPayout: review.reportedPayout,
        eventId,
        userId: user.id,
        userEdited: review.userEdited,
        revisionKind: review.revisionKind,
        replacesDocumentId: review.revisionKind && pending.duplicates[0] ? pending.duplicates[0].id : null,
        isForecast: review.isForecast,
      });
      setPending(null);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function handleDelete(documentId: string, name: string | null) {
    Alert.alert(
      'Remove document data',
      `Remove "${name ?? 'this document'}" and all its extracted line items? The original file was never stored, so this removes everything.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteDoc.mutate({ documentId, eventId }) },
      ],
    );
  }

  async function handleExport() {
    const header = 'Event,Provider,Document,Kind,Period,Description,Category,Net,VAT,Gross,VAT treatment,Reclaimability,Role,Forecast';
    const esc = (s: string | null | undefined) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const rows = lineItems.map((l) => {
      const doc = docs.find((d) => d.id === l.document_id);
      return [
        esc(eventName), esc(doc?.provider ?? l.provider), esc(doc?.file_name), esc(doc?.kind),
        esc(doc?.period_start ? `${doc.period_start}..${doc.period_end ?? doc.period_start}` : ''),
        esc(l.description), esc(l.category),
        l.net ?? '', l.vat ?? '', l.gross ?? '',
        esc(l.vat_treatment), esc(l.reclaimability), esc(l.settlement_role), l.is_forecast ? 'yes' : 'no',
      ].join(',');
    });
    const payoutRows = docs.filter((d) => d.reported_payout !== null || d.expected_payout !== null).map((d) =>
      [esc(eventName), esc(d.provider), esc(d.file_name), esc(d.kind), esc(d.period_start ?? ''),
        esc(`PAYOUT — reported ${d.reported_payout ?? '—'} vs expected ${d.expected_payout ?? '—'} (${d.reconciliation_status})`),
        esc('payout'), '', '', d.reported_payout ?? '', '', '', '', ''].join(','));
    await Share.share({
      message: [header, ...rows, ...payoutRows].join('\n'),
      title: `${eventName} — deductions & VAT`,
    });
  }

  if (!scanner.allowed) {
    return (
      <UpgradePrompt
        feature="doc_scanner"
        description="Import settlement statements, deduction reports and contracts — the app reads them on your device, breaks out every fee with its VAT, and reconciles the payout."
      />
    );
  }

  const statusIcon = (s: string) =>
    s === 'reconciled' ? 'checkmark-circle-outline'
      : s === 'rounding_difference' ? 'ellipse-outline'
        : s === 'missing_information' ? 'help-circle-outline'
          : 'alert-circle-outline';

  return (
    <View>
      {/* Import button */}
      <TouchableOpacity
        onPress={handleImport}
        disabled={parseDoc.isPending}
        accessibilityRole="button"
        accessibilityLabel="Import a financial document"
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderWidth: 1, borderColor: p.border, borderStyle: 'dashed',
          padding: 14, backgroundColor: p.surface, marginBottom: 10,
        }}
      >
        {parseDoc.isPending ? (
          <>
            <ActivityIndicator color={p.brand} size="small" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: p.textMuted }}>Reading on this device…</Text>
          </>
        ) : (
          <>
            <Ionicons name="document-text-outline" size={18} color={p.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: p.text }}>Import financial document</Text>
              <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>
                Settlement, deductions, fee invoice or contract · PDF or CSV · never uploaded
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Documents list */}
      {isLoading ? (
        <ActivityIndicator color={p.brand} style={{ marginVertical: 10 }} />
      ) : docs.map((doc) => (
        <View key={doc.id} style={{ borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 12, marginBottom: 8, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: p.text }} numberOfLines={1}>
                {doc.file_name ?? DOCUMENT_KIND_LABELS[doc.kind as DocumentKind] ?? doc.kind}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint }}>
                {[doc.provider, DOCUMENT_KIND_LABELS[doc.kind as DocumentKind],
                  doc.period_start ? `${doc.period_start}` : null,
                  doc.user_edited ? 'edited in review' : null,
                  doc.revision_kind ? `marked ${doc.revision_kind}` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(doc.id, doc.file_name)} accessibilityRole="button" accessibilityLabel={`Delete ${doc.file_name ?? 'document'}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={15} color={p.textFaint} />
            </TouchableOpacity>
          </View>
          {(doc.reported_payout !== null || doc.expected_payout !== null) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={statusIcon(doc.reconciliation_status)} size={13}
                color={doc.reconciliation_status === 'reconciled' ? '#16a34a' : p.brand} />
              <Text style={{ fontSize: 11, color: p.textMuted }}>
                {RECONCILIATION_LABELS[doc.reconciliation_status as ReconciliationStatus] ?? doc.reconciliation_status}
                {doc.reported_payout !== null ? ` · paid out ${money(doc.reported_payout)}` : ''}
                {doc.expected_payout !== null && doc.reported_payout !== doc.expected_payout ? ` · expected ${money(doc.expected_payout)}` : ''}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* VAT position */}
      {(vatPosition.inputVatRecorded !== 0 || vatPosition.outputVat !== 0) && (
        <View style={{ borderWidth: 1, borderColor: p.borderStrong, backgroundColor: p.surface, padding: 12, marginTop: 4, marginBottom: 8, gap: 5 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase' }}>
            VAT position (this event)
          </Text>
          {[
            ['VAT collected on sales', vatPosition.outputVat],
            ['Input VAT recorded on fees', vatPosition.inputVatRecorded],
            ['Potentially reclaimable input VAT', vatPosition.inputVatPotentiallyReclaimable],
          ].map(([label, value]) => (
            <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: p.textMuted }}>{label as string}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: p.text, fontVariant: ['tabular-nums'] }}>{money(value as number)}</Text>
            </View>
          ))}
          <Text style={{ fontSize: 10, color: p.textFaint, fontStyle: 'italic' }}>
            Reclaim eligibility varies — check with your accountant. Mark each line's status when reviewing.
          </Text>
        </View>
      )}

      {/* Forecast vs actual */}
      {variance.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 12, marginBottom: 8, gap: 5 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase' }}>
            Contract vs actual charges
          </Text>
          {variance.slice(0, 6).map((v) => (
            <View key={v.category} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ flex: 1, fontSize: 12, color: p.text }}>
                {LINE_CATEGORY_LABELS[v.category as LineCategory] ?? v.category}
              </Text>
              <Text style={{ fontSize: 13, color: p.textMuted, fontVariant: ['tabular-nums'] }}>
                {money(v.forecastGross)} → {money(v.actualGross)}
              </Text>
              <Text style={{
                fontSize: 10, fontWeight: '700',
                color: v.status === 'as_expected' ? '#16a34a' : p.brand,
              }}>
                {v.status === 'as_expected' ? 'OK'
                  : v.status === 'unplanned' ? 'UNPLANNED'
                    : v.status === 'missing' ? 'NOT CHARGED'
                      : `${v.difference > 0 ? '+' : ''}${money(v.difference)}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Accountant export */}
      {lineItems.length > 0 && (
        <TouchableOpacity
          onPress={handleExport}
          accessibilityRole="button"
          accessibilityLabel="Export deductions and VAT as CSV"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: p.text, paddingVertical: 10, marginBottom: 4, minHeight: 40 }}
        >
          <Ionicons name="share-outline" size={13} color={p.text} />
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.text }}>EXPORT FOR ACCOUNTANT (CSV)</Text>
        </TouchableOpacity>
      )}

      {pending && (
        <FinancialDocReviewModal
          pending={pending}
          isSaving={saveDoc.isPending}
          eventName={eventName}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </View>
  );
}
