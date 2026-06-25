import React from 'react';
import {
  View, Text, Modal, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/lib/themeContext';
import type { PendingImportData } from '@/types/cogs';

interface Props {
  pending: PendingImportData | null;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const MAX_PREVIEW_ROWS = 8;

export function ImportReviewModal({ pending, isSaving, onConfirm, onCancel }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;

  if (!pending) return null;

  const formatFormat = pending.sourceFormat === 'pdf' ? 'PDF' : 'CSV';
  const previewRows = pending.lines.slice(0, MAX_PREVIEW_ROWS);
  const hiddenRows = pending.lines.length - previewRows.length;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderBottomWidth: 2, borderBottomColor: p.text,
        }}>
          <View>
            <Text style={{ fontSize: 10, letterSpacing: 1.5, color: p.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
              Review Import
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: p.text, marginTop: 2 }}>
              {pending.fileName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel import"
            style={{ padding: 6 }}
          >
            <Text style={{ fontSize: 20, color: p.text }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

          {/* Detected type row */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: p.surface, padding: 12,
            borderWidth: 1, borderColor: p.border, marginBottom: 12,
          }}>
            <Text style={{ fontSize: 18 }}>{pending.sourceFormat === 'pdf' ? '📄' : '📊'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: p.text }}>
                {formatFormat} Sales Report
              </Text>
              {pending.reportDate && (
                <Text style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>
                  Report date: {pending.reportDate}
                </Text>
              )}
            </View>
            <View style={{
              backgroundColor: pending.summary.totalLineItems > 0 ? p.brandSoft : p.surfaceAlt,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: p.brand }}>
                {pending.summary.totalLineItems} item{pending.summary.totalLineItems !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Duplicate warning */}
          {pending.hasDuplicate && (
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#d97706',
              padding: 12, marginBottom: 12,
            }}>
              <Text style={{ fontSize: 14, color: '#92400e' }}>⚠</Text>
              <Text style={{ flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 }}>
                This event already has a sales report. Importing will add another one — not replace it. Tap Cancel if this is a duplicate.
              </Text>
            </View>
          )}

          {/* Warnings */}
          {pending.warnings.map((w, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 8,
              backgroundColor: p.surface, borderWidth: 1, borderColor: p.brand,
              padding: 10, marginBottom: 8,
            }}>
              <Text style={{ fontSize: 12, color: p.brand }}>!</Text>
              <Text style={{ flex: 1, fontSize: 12, color: p.textMuted, lineHeight: 18 }}>{w}</Text>
            </View>
          ))}

          {/* Parse errors (non-fatal: partial data) */}
          {pending.parseErrors.length > 0 && pending.lines.length > 0 && (
            <View style={{
              backgroundColor: p.surfaceAlt, borderWidth: 1, borderColor: p.border,
              padding: 10, marginBottom: 12,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: p.textMuted, marginBottom: 4 }}>
                PARSER NOTES
              </Text>
              {pending.parseErrors.map((e, i) => (
                <Text key={i} style={{ fontSize: 11, color: p.textFaint, lineHeight: 16 }}>• {e}</Text>
              ))}
            </View>
          )}

          {/* Totals summary */}
          <View style={{
            flexDirection: 'row', marginBottom: 12,
            borderWidth: 1, borderColor: p.border, overflow: 'hidden',
          }}>
            <View style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: p.text }}>
                £{pending.summary.totalRevenueFromFile.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Revenue
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: p.border }} />
            <View style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: p.brand }}>
                £{pending.summary.calculatedCogs.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Est. COGS
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: p.border }} />
            <View style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: p.textMuted }}>
                {pending.summary.matchedItems}/{pending.summary.totalLineItems}
              </Text>
              <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Matched
              </Text>
            </View>
          </View>

          {/* Detected products preview */}
          <Text style={{
            fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: p.textMuted,
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Detected Products
          </Text>

          {previewRows.map((line, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, paddingVertical: 9,
              borderWidth: 1, borderColor: p.border,
              backgroundColor: p.surface, marginBottom: 4, gap: 8,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: p.text }} numberOfLines={1}>
                  {line.product_name}
                </Text>
                {line.matched_product && (
                  <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>
                    → {line.matched_product.name} ({Math.round((line.match_confidence ?? 0) * 100)}% match)
                  </Text>
                )}
                {!line.matched_product && (
                  <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>
                    Unmatched — assign after import
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 1 }}>
                <Text style={{ fontSize: 12, color: p.textMuted }}>
                  ×{line.quantity % 1 === 0 ? line.quantity : line.quantity.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: p.text }}>
                  £{line.line_total.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          {hiddenRows > 0 && (
            <Text style={{ fontSize: 12, color: p.textFaint, textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
              +{hiddenRows} more item{hiddenRows !== 1 ? 's' : ''} not shown
            </Text>
          )}

          {pending.lines.length === 0 && (
            <View style={{
              backgroundColor: p.surfaceAlt, borderWidth: 1, borderColor: p.border,
              padding: 16, alignItems: 'center', marginTop: 8,
            }}>
              <Text style={{ fontSize: 13, color: p.textFaint, textAlign: 'center' }}>
                No products detected. Review the errors above.
              </Text>
            </View>
          )}

        </ScrollView>

        {/* Footer actions */}
        <View style={{
          flexDirection: 'row', padding: 16, gap: 10,
          borderTopWidth: 1, borderTopColor: p.border,
          backgroundColor: p.bg,
        }}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Cancel and discard"
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              paddingVertical: 13, paddingHorizontal: 18,
              borderWidth: 1, borderColor: p.border, flex: 1,
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: p.textMuted }}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            disabled={isSaving || pending.lines.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Confirm and save import"
            style={[
              {
                flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, backgroundColor: p.text, paddingVertical: 13,
              },
              (isSaving || pending.lines.length === 0) && { opacity: 0.5 },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={p.bg} size="small" />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '700', color: p.bg, letterSpacing: 0.5 }}>
                IMPORT {pending.summary.totalLineItems} ITEM{pending.summary.totalLineItems !== 1 ? 'S' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
