import React, { useMemo, useState } from 'react';
import {
  View, Text, Modal, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import type { PendingFinancialImport } from '@/lib/mutations/financialDocs';
import {
  DOCUMENT_KIND_LABELS, LINE_CATEGORY_LABELS,
  type DocLineItem, type LineCategory, type VatTreatment,
} from '@/lib/docscan/model';
import { completeVat } from '@/lib/docscan/vat';
import { reconcilePayout } from '@/lib/docscan/reconcile';
import { RECONCILIATION_LABELS } from '@/lib/docscan/reconcile';

interface Props {
  pending: PendingFinancialImport;
  isSaving: boolean;
  eventName: string | null;
  onConfirm: (result: {
    lines: DocLineItem[];
    reportedPayout: number | null;
    userEdited: boolean;
    revisionKind: string | null;
    isForecast: boolean;
  }) => void;
  onCancel: () => void;
}

const TREATMENT_CYCLE: VatTreatment[] = ['inclusive', 'exclusive', 'no_vat', 'exempt', 'outside', 'unknown'];
const TREATMENT_LABELS: Record<VatTreatment, string> = {
  inclusive: 'Inc. VAT 20%', exclusive: '+ VAT 20%', no_vat: 'No VAT',
  exempt: 'Exempt', outside: 'Outside scope', unknown: 'VAT unknown',
};
const CATEGORY_CYCLE = Object.keys(LINE_CATEGORY_LABELS) as LineCategory[];

const CONF_ICON = { high: 'checkmark-circle-outline', medium: 'help-circle-outline', low: 'alert-circle-outline' } as const;
const CONF_LABEL = { high: 'High confidence', medium: 'Check this value', low: 'Low confidence — please verify' } as const;

/**
 * Decimal-safe gross editor. Controlling the input directly from the
 * parsed number destroyed in-progress decimals ('12.' → 12 → '12', so
 * '12.50' became 1250 — a 100× wrong fee). Local text state, parsed
 * value pushed up; re-synced when the line's gross changes externally
 * (VAT-treatment recompute, row reuse). Negative values are allowed —
 * a negative line is a credit to the trader.
 */
function GrossInput({ value, onChangeValue, accessibilityLabel, textColor, borderColor }: {
  value: number | null;
  onChangeValue: (v: number) => void;
  accessibilityLabel: string;
  textColor: string;
  borderColor: string;
}) {
  const [text, setText] = React.useState(value === null ? '' : String(value));
  React.useEffect(() => {
    const parsed = parseFloat(text.replace(/[£,]/g, ''));
    const textValue = isNaN(parsed) ? 0 : parsed;
    if (textValue !== (value ?? 0)) setText(value === null ? '' : String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        const cleaned = t.replace(/[^0-9.\-]/g, '');
        setText(cleaned);
        const v = parseFloat(cleaned);
        onChangeValue(isNaN(v) ? 0 : v);
      }}
      keyboardType="numbers-and-punctuation"
      style={{
        minWidth: 70, textAlign: 'right', fontSize: 14, fontWeight: '700',
        color: textColor, borderBottomWidth: 1, borderBottomColor: borderColor, padding: 2,
      }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/**
 * Mandatory review before any financial document affects event data.
 * Everything shown is editable; nothing is saved until Confirm.
 * Confidence is communicated with icons + labels, never colour alone.
 */
export function FinancialDocReviewModal({ pending, isSaving, eventName, onConfirm, onCancel }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const { scan, contractTerms, duplicates } = pending;

  const isContract = scan.kind === 'contract';
  const initialLines = isContract && contractTerms ? contractTerms.candidateCosts : scan.lines;

  const [lines, setLines] = useState<DocLineItem[]>(initialLines);
  const [payoutText, setPayoutText] = useState(scan.reportedPayout?.value?.toFixed(2) ?? '');
  const [edited, setEdited] = useState(false);
  const [revisionKind, setRevisionKind] = useState<string | null>(null);

  const reportedPayout = payoutText.trim() === '' ? null : parseFloat(payoutText.replace(/[£,]/g, ''));

  const liveReconciliation = useMemo(() => reconcilePayout({
    sales: scan.sales,
    lines,
    reportedPayout: reportedPayout !== null && !isNaN(reportedPayout)
      ? { value: reportedPayout, confidence: 'high', sourceText: 'review' }
      : null,
  }), [scan.sales, lines, reportedPayout]);

  function updateLine(idx: number, patch: Partial<DocLineItem>) {
    setEdited(true);
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      const hasRate = next.vatTreatment === 'inclusive' || next.vatTreatment === 'exclusive';
      const rate = hasRate ? (next.vatRate ?? 0.20) : null;
      if (patch.gross !== undefined) {
        // The £ field the user edits IS the gross. Derive net/vat from the
        // TYPED value — never from the stale pre-edit net (feeding next.net
        // to completeVat on '+ VAT' lines silently reverted every edit).
        const triple = completeVat({ amount: patch.gross ?? 0, treatment: 'inclusive', rate });
        next.gross = triple.gross;
        next.net = triple.net;
        next.vat = hasRate ? triple.vat : null;
      } else if (patch.vatTreatment !== undefined) {
        // Treatment change reinterprets the existing amount: the shown
        // figure stays the doc's figure (net for '+ VAT', gross otherwise).
        const basis = next.vatTreatment === 'exclusive' ? (next.net ?? next.gross ?? 0) : (next.gross ?? next.net ?? 0);
        const triple = completeVat({ amount: basis, treatment: next.vatTreatment, rate });
        next.net = triple.net;
        next.vat = hasRate ? triple.vat : null;
        next.gross = triple.gross;
      }
      return next;
    }));
  }

  function removeLine(idx: number) {
    setEdited(true);
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function addLine() {
    setEdited(true);
    setLines((prev) => [...prev, {
      description: 'New deduction',
      category: 'other',
      net: 0, vat: null, gross: 0, vatRate: null,
      vatTreatment: 'unknown', reclaimability: 'pending_review',
      role: 'deducted_at_source', confidence: 'high',
      sourceText: 'added manually',
    }]);
  }

  function handleConfirm() {
    if (duplicates.length > 0 && revisionKind === null) {
      Alert.alert(
        'Possible duplicate',
        'Choose how to treat this document before importing.',
      );
      return;
    }
    const hasUnknownVat = lines.some((l) => l.vatTreatment === 'unknown' && (l.gross ?? 0) !== 0);
    const proceed = () => onConfirm({
      lines,
      reportedPayout: reportedPayout !== null && !isNaN(reportedPayout) ? reportedPayout : null,
      userEdited: edited,
      revisionKind,
      isForecast: isContract,
    });
    if (hasUnknownVat) {
      Alert.alert(
        'VAT treatment not set',
        'Some lines have an unknown VAT treatment. They will be imported with no VAT split — you can edit them later.',
        [{ text: 'Go back', style: 'cancel' }, { text: 'Import anyway', onPress: proceed }],
      );
      return;
    }
    proceed();
  }

  const money = (v: number | null | undefined) =>
    v === null || v === undefined ? '—' : `${v < 0 ? '−' : ''}£${Math.abs(v).toFixed(2)}`;

  const salesRows: { label: string; value: number | null | undefined; conf?: 'high' | 'medium' | 'low' }[] = [
    { label: 'Gross sales', value: scan.sales.grossSales?.value, conf: scan.sales.grossSales?.confidence },
    { label: 'Refunds', value: scan.sales.refunds?.value, conf: scan.sales.refunds?.confidence },
    { label: 'Discounts', value: scan.sales.discounts?.value, conf: scan.sales.discounts?.confidence },
    { label: 'Net sales', value: scan.sales.netSales?.value, conf: scan.sales.netSales?.confidence },
    { label: 'VAT on sales', value: scan.sales.salesVat?.value, conf: scan.sales.salesVat?.confidence },
    { label: 'Card sales', value: scan.sales.cardSales?.value, conf: scan.sales.cardSales?.confidence },
    { label: 'Cash sales', value: scan.sales.cashSales?.value, conf: scan.sales.cashSales?.confidence },
  ].filter((r) => r.value !== null && r.value !== undefined);

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottomWidth: 2, borderBottomColor: p.text,
        }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 10, letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
              Review before import
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: p.text, marginTop: 2 }} numberOfLines={1}>
              {pending.fileName}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel import" style={{ padding: 6 }}>
            <Text style={{ fontSize: 20, color: p.text }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

          {/* Detected type / provider / period / event */}
          <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 12, marginBottom: 12, gap: 3 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: p.text }}>
              {DOCUMENT_KIND_LABELS[scan.kind]}{scan.provider ? ` · ${scan.provider}` : ''}
            </Text>
            <Text style={{ fontSize: 11, color: p.textMuted }}>
              {[
                scan.documentRef ? `Ref ${scan.documentRef}` : null,
                scan.periodStart ? `${scan.periodStart}${scan.periodEnd && scan.periodEnd !== scan.periodStart ? ` → ${scan.periodEnd}` : ''}` : null,
                `Detection: ${CONF_LABEL[scan.kindConfidence].toLowerCase()}`,
              ].filter(Boolean).join(' · ')}
            </Text>
            <Text style={{ fontSize: 11, color: p.textFaint }}>
              {eventName ? `Will be saved to: ${eventName}` : 'Will be saved unassigned — you can link it to an event later.'}
            </Text>
            <Text style={{ fontSize: 11, color: p.textFaint, fontStyle: 'italic' }}>
              The file was read on this device and will not be uploaded or stored — only the values you confirm below are saved.
            </Text>
          </View>

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: '#d97706', backgroundColor: p.surface, padding: 12, marginBottom: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="copy-outline" size={14} color="#92400e" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e' }}>
                  Possible duplicate of {duplicates.length === 1 ? `"${duplicates[0].file_name ?? 'a previous import'}"` : `${duplicates.length} previous imports`}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: p.textMuted }}>
                Same file or matching provider, period and payout. Choose how to treat this import:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { key: 'duplicate', label: 'It\'s a duplicate — import anyway' },
                  { key: 'revised', label: 'Revised statement' },
                  { key: 'replacement', label: 'Replacement' },
                  { key: 'separate', label: 'Separate settlement' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setRevisionKind(opt.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: revisionKind === opt.key }}
                    style={{
                      borderWidth: 1, borderColor: revisionKind === opt.key ? p.text : p.border,
                      backgroundColor: revisionKind === opt.key ? p.text : 'transparent',
                      paddingHorizontal: 10, paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: revisionKind === opt.key ? p.bg : p.textMuted }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Warnings */}
          {[...scan.warnings, ...(contractTerms?.warnings ?? [])].map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: p.brand, backgroundColor: p.surface, padding: 10, marginBottom: 8 }}>
              <Ionicons name="information-circle-outline" size={14} color={p.brand} />
              <Text style={{ flex: 1, fontSize: 12, color: p.textMuted, lineHeight: 17 }}>{w}</Text>
            </View>
          ))}

          {/* Sales summary */}
          {salesRows.length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                Sales
              </Text>
              <View style={{ borderWidth: 1, borderColor: p.border, marginBottom: 14 }}>
                {salesRows.map((r, i) => (
                  <View key={r.label} style={{
                    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.border, gap: 8,
                  }}>
                    <Text style={{ flex: 1, fontSize: 13, color: p.text }}>{r.label}</Text>
                    {r.conf && r.conf !== 'high' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name={CONF_ICON[r.conf]} size={12} color={p.brand} />
                        <Text style={{ fontSize: 9, color: p.brand }}>{CONF_LABEL[r.conf]}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 13, fontWeight: '600', color: p.text, fontVariant: ['tabular-nums'] }}>
                      {money(r.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Line items */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase' }}>
              {isContract ? 'Planned costs from contract' : 'Fees, deductions & credits'}
            </Text>
            <TouchableOpacity onPress={addLine} accessibilityRole="button" accessibilityLabel="Add a line">
              <Text style={{ fontSize: 11, color: p.brand, fontWeight: '700' }}>+ ADD LINE</Text>
            </TouchableOpacity>
          </View>

          {lines.length === 0 && (
            <View style={{ borderWidth: 1, borderColor: p.border, backgroundColor: p.surfaceAlt, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: p.textFaint, textAlign: 'center' }}>
                No fees or deductions detected. Add them manually if the document lists any.
              </Text>
            </View>
          )}

          {lines.map((line, idx) => (
            <View key={idx} style={{ borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 10, marginBottom: 8, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  value={line.description}
                  onChangeText={(t) => updateLine(idx, { description: t })}
                  style={{ flex: 1, fontSize: 13, fontWeight: '600', color: p.text, padding: 0 }}
                  accessibilityLabel="Line description"
                />
                {line.confidence !== 'high' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name={CONF_ICON[line.confidence]} size={13} color={p.brand} />
                    <Text style={{ fontSize: 9, color: p.brand }}>{line.confidence === 'low' ? 'VERIFY' : 'CHECK'}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => removeLine(idx)} accessibilityRole="button" accessibilityLabel={`Remove ${line.description}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={15} color={p.textFaint} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Category cycle */}
                <TouchableOpacity
                  onPress={() => {
                    const next = CATEGORY_CYCLE[(CATEGORY_CYCLE.indexOf(line.category) + 1) % CATEGORY_CYCLE.length];
                    updateLine(idx, { category: next });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${LINE_CATEGORY_LABELS[line.category]}. Tap to change.`}
                  style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 10, color: p.textMuted }}>{LINE_CATEGORY_LABELS[line.category]}</Text>
                </TouchableOpacity>
                {/* VAT treatment cycle */}
                <TouchableOpacity
                  onPress={() => {
                    const next = TREATMENT_CYCLE[(TREATMENT_CYCLE.indexOf(line.vatTreatment) + 1) % TREATMENT_CYCLE.length];
                    updateLine(idx, { vatTreatment: next, vatRate: next === 'inclusive' || next === 'exclusive' ? 0.20 : null });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`VAT treatment: ${TREATMENT_LABELS[line.vatTreatment]}. Tap to change.`}
                  style={{ borderWidth: 1, borderColor: line.vatTreatment === 'unknown' ? p.brand : p.border, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 10, color: line.vatTreatment === 'unknown' ? p.brand : p.textMuted }}>
                    {TREATMENT_LABELS[line.vatTreatment]}
                  </Text>
                </TouchableOpacity>
                {/* Gross amount */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2 }}>
                  <Text style={{ fontSize: 12, color: p.textFaint }}>£</Text>
                  <GrossInput
                    value={line.gross}
                    onChangeValue={(v) => updateLine(idx, { gross: v })}
                    accessibilityLabel={`Gross amount for ${line.description}`}
                    textColor={p.text}
                    borderColor={p.border}
                  />
                </View>
              </View>

              {line.vat !== null && line.vat !== 0 && (
                <Text style={{ fontSize: 10, color: p.textFaint }}>
                  Net {money(line.net)} · VAT {money(line.vat)} · negative = credit to you
                </Text>
              )}
              <Text style={{ fontSize: 9, color: p.textFaint, fontStyle: 'italic' }} numberOfLines={1}>
                From: “{line.sourceText}”
              </Text>
            </View>
          ))}

          {/* Payout + reconciliation (not shown for contracts) */}
          {!isContract && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase', marginTop: 8, marginBottom: 6 }}>
                Payout
              </Text>
              <View style={{ borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 12, gap: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 13, color: p.text }}>Reported paid out</Text>
                  <Text style={{ fontSize: 12, color: p.textFaint }}>£</Text>
                  <TextInput
                    value={payoutText}
                    onChangeText={(t) => { setPayoutText(t); setEdited(true); }}
                    keyboardType="numbers-and-punctuation"
                    placeholder="not stated"
                    placeholderTextColor={p.textFaint}
                    style={{ minWidth: 90, textAlign: 'right', fontSize: 15, fontWeight: '700', color: p.text, borderBottomWidth: 1, borderBottomColor: p.border, padding: 2 }}
                    accessibilityLabel="Reported payout amount"
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: p.textMuted }}>App-calculated payout</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: p.text, fontVariant: ['tabular-nums'] }}>
                    {money(liveReconciliation.expectedPayout)}
                  </Text>
                </View>
                <View style={{
                  flexDirection: 'row', gap: 8, alignItems: 'flex-start',
                  borderTopWidth: 1, borderTopColor: p.border, paddingTop: 8,
                }}>
                  <Ionicons
                    name={liveReconciliation.status === 'reconciled' ? 'checkmark-circle-outline'
                      : liveReconciliation.status === 'rounding_difference' ? 'ellipse-outline'
                        : 'alert-circle-outline'}
                    size={15}
                    color={liveReconciliation.status === 'reconciled' ? '#16a34a' : p.brand}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: p.text }}>
                      {RECONCILIATION_LABELS[liveReconciliation.status]}
                      {liveReconciliation.difference !== null && liveReconciliation.difference !== 0
                        ? ` · ${money(liveReconciliation.difference)}` : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: p.textMuted, lineHeight: 16 }}>{liveReconciliation.explanation}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={{ flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: p.border }}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Cancel — nothing will be saved"
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderWidth: 1, borderColor: p.border, opacity: isSaving ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: p.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={isContract ? 'Save planned costs' : 'Confirm and import'}
            style={{ flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, backgroundColor: p.text, opacity: isSaving ? 0.5 : 1 }}
          >
            {isSaving ? <ActivityIndicator color={p.bg} size="small" /> : (
              <Text style={{ fontSize: 13, fontWeight: '700', color: p.bg, letterSpacing: 1 }}>
                {isContract ? 'SAVE PLANNED COSTS' : 'CONFIRM IMPORT'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
