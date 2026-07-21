import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { format, parseISO } from 'date-fns';
import { safeEventDays } from '@/lib/dates';
import { useTheme } from '@/lib/themeContext';
import { formatCurrency } from '@/lib/formatters';
import { useDailyTakings } from '@/lib/queries/dailyTakings';
import { useUpsertDailyTakings } from '@/lib/mutations/dailyTakings';
import type { DailyTakings } from '@/types';

interface Props {
  eventId: string;
  startDate: string;
  endDate: string;
  readOnly?: boolean;
}

interface DayInput {
  total_takings: string;
  hot_drinks_sales: string;
  iced_drinks_sales: string;
  notes: string;
}

export function DailyTakingsCard({ eventId, startDate, endDate, readOnly = false }: Props) {
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const { data: dailyTakings = [], isLoading } = useDailyTakings(eventId);
  const upsert = useUpsertDailyTakings(eventId);
  // Bounded expansion — a malformed end_date must never render thousands
  // of rows (the LIV Golf force-close). 31 days is beyond any real event.
  const range = safeEventDays(startDate, endDate, 31);
  const days = range.days.map((d) => parseISO(d));

  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, DayInput>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const hotColor = p.brand;
  const icedColor = isDark ? '#7dd3fc' : '#0369a1';
  const icedBarBg = isDark ? '#0ea5e9' : '#7dd3fc';
  const todayBg = isDark ? p.surfaceAlt : '#fffbeb';

  function getRecorded(dateStr: string): DailyTakings | undefined {
    return dailyTakings.find((d) => d.day_date === dateStr);
  }

  function getInput(dateStr: string): DayInput {
    if (inputs[dateStr]) return inputs[dateStr];
    const ex = getRecorded(dateStr);
    return {
      total_takings:    ex?.total_takings    ? String(ex.total_takings)    : '',
      hot_drinks_sales: ex?.hot_drinks_sales ? String(ex.hot_drinks_sales) : '',
      iced_drinks_sales: ex?.iced_drinks_sales ? String(ex.iced_drinks_sales) : '',
      notes: ex?.notes ?? '',
    };
  }

  function updateInput(dateStr: string, field: keyof DayInput, value: string) {
    const cur = getInput(dateStr);
    let next = { ...cur, [field]: value };

    if (field === 'hot_drinks_sales') {
      const total = parseFloat(cur.total_takings) || 0;
      const hot = parseFloat(value) || 0;
      if (total > 0) next.iced_drinks_sales = String(Math.max(0, total - hot).toFixed(2));
    }
    if (field === 'iced_drinks_sales') {
      const total = parseFloat(cur.total_takings) || 0;
      const iced = parseFloat(value) || 0;
      if (total > 0) next.hot_drinks_sales = String(Math.max(0, total - iced).toFixed(2));
    }
    if ((field === 'hot_drinks_sales' || field === 'iced_drinks_sales') && !cur.total_takings) {
      const hot = parseFloat(field === 'hot_drinks_sales' ? value : next.hot_drinks_sales) || 0;
      const iced = parseFloat(field === 'iced_drinks_sales' ? value : next.iced_drinks_sales) || 0;
      if (hot > 0 && iced > 0) next.total_takings = String((hot + iced).toFixed(2));
    }

    setInputs((prev) => ({ ...prev, [dateStr]: next }));
  }

  async function persistDay(dateStr: string, dayNumber: number, total: number, hot: number, iced: number, notes: string) {
    setSaving(dateStr);
    try {
      await upsert.mutateAsync({
        day_date: dateStr,
        day_number: dayNumber,
        total_takings: total,
        hot_drinks_sales: hot,
        iced_drinks_sales: iced,
        avg_temp_c: null,
        weather_code: null,
        notes,
      });
      setExpandedDay(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(null);
    }
  }

  async function saveDay(dateStr: string, dayNumber: number) {
    const inp = getInput(dateStr);
    const total = parseFloat(inp.total_takings) || 0;
    const hot   = parseFloat(inp.hot_drinks_sales) || 0;
    const iced  = parseFloat(inp.iced_drinks_sales) || 0;

    if (total === 0) { Alert.alert('Required', 'Please enter total takings for this day.'); return; }
    if (hot > 0 && iced > 0 && Math.abs((hot + iced) - total) > total * 0.02) {
      Alert.alert('Check figures', `Hot (${formatCurrency(hot)}) + Iced (${formatCurrency(iced)}) = ${formatCurrency(hot + iced)} but Total is ${formatCurrency(total)}. Please check.`);
      return;
    }

    // Total-only entry: do NOT invent a split. The old fallback
    // (iced = total − hot) silently classified the whole day as
    // zero-rated iced sales, understating VAT due on what is mostly
    // 20%-rated hot-drink revenue. Save with no split — VAT breakdown
    // simply stays unknown for the day — after telling the user why the
    // hot figure matters.
    if (hot === 0 && iced === 0) {
      Alert.alert(
        'No hot/iced split entered',
        'Hot drinks carry 20% VAT; iced are zero-rated. Without a split, this day is saved with no VAT breakdown. Enter at least the hot figure for an accurate VAT position.',
        [
          { text: 'Add split', style: 'cancel' },
          { text: 'Save without split', onPress: () => { void persistDay(dateStr, dayNumber, total, 0, 0, inp.notes); } },
        ],
      );
      return;
    }

    await persistDay(dateStr, dayNumber, total, hot, iced || Math.max(0, total - hot), inp.notes);
  }

  const totalTakings = dailyTakings.reduce((s, d) => s + d.total_takings, 0);
  const totalHot     = dailyTakings.reduce((s, d) => s + d.hot_drinks_sales, 0);
  const totalIced    = dailyTakings.reduce((s, d) => s + d.iced_drinks_sales, 0);
  const hotPct       = (totalHot + totalIced) > 0 ? Math.round((totalHot / (totalHot + totalIced)) * 100) : null;
  const daysRecorded = dailyTakings.filter((d) => d.total_takings > 0).length;
  const hotNet       = totalHot / 1.2;
  const vatDue       = totalHot - hotNet;
  const netRevenue   = hotNet + totalIced;

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, marginBottom: 12, overflow: 'hidden' }}>
      {/* Header (ink-block) */}
      <View style={{ backgroundColor: p.text, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: tokens.type.display, color: p.bg, fontSize: 17 }}>Daily Takings</Text>
          {daysRecorded > 0 && (
            <Text style={{ color: p.brandSoft, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '700' }}>
              {daysRecorded}/{days.length} recorded
            </Text>
          )}
        </View>
        {totalTakings > 0 && (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <View>
              <Text style={{ color: p.brandSoft, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Takings</Text>
              <Text style={{ color: p.bg, fontWeight: '700', fontSize: 16, fontFamily: tokens.type.display }}>{formatCurrency(totalTakings)}</Text>
            </View>
            <View>
              <Text style={{ color: p.brandSoft, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Net</Text>
              <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 16, fontFamily: tokens.type.display }}>{formatCurrency(netRevenue)}</Text>
            </View>
            <View>
              <Text style={{ color: p.brandSoft, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>VAT</Text>
              <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 16, fontFamily: tokens.type.display }}>{formatCurrency(vatDue)}</Text>
            </View>
          </View>
        )}
        {hotPct !== null && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: p.brandSoft, fontSize: 10 }}>☕ Hot {hotPct}%</Text>
              <Text style={{ color: p.brandSoft, fontSize: 10 }}>🧊 Iced {100 - hotPct}%</Text>
            </View>
            <View style={{ flexDirection: 'row', overflow: 'hidden', height: 8 }}>
              <View style={{ flex: hotPct, backgroundColor: hotColor }} />
              <View style={{ flex: 100 - hotPct, backgroundColor: icedBarBg }} />
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={p.brand} style={{ padding: 20 }} />
      ) : readOnly && dailyTakings.length === 0 ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: p.textFaint, fontSize: 13 }}>No daily takings recorded yet</Text>
        </View>
      ) : (
        <>
        {(range.clamped || range.invalid) && (
          <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: p.border }}>
            <Text style={{ fontSize: 12, color: p.textMuted, fontStyle: 'italic' }}>
              {range.clamped
                ? `This event's dates span ${range.requestedSpanDays} days — showing the first ${days.length}. Check the start and end dates in Edit Event.`
                : "This event's end date couldn't be read — showing the start date only. Check the dates in Edit Event."}
            </Text>
          </View>
        )}
        {days.map((day, index) => {
          const dateStr  = format(day, 'yyyy-MM-dd');
          const dayNum   = index + 1;
          const recorded = getRecorded(dateStr);
          const isExpanded = expandedDay === dateStr;
          const isToday  = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const inp      = getInput(dateStr);

          return (
            <View key={dateStr} style={{ borderTopWidth: 1, borderTopColor: p.border }}>
              <TouchableOpacity
                onPress={() => readOnly ? undefined : setExpandedDay(isExpanded ? null : dateStr)}
                disabled={readOnly}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: isToday ? todayBg : p.surface }}
                activeOpacity={readOnly ? 1 : 0.7}
              >
                <View style={{
                  width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  borderWidth: recorded ? 0 : 1, borderColor: p.border,
                  backgroundColor: recorded ? p.brand : isToday ? p.brandSoft : p.surfaceAlt,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: recorded ? p.bg : isToday ? p.brand : p.textMuted, letterSpacing: 0.5 }}>D{dayNum}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontWeight: '600', color: p.text, fontSize: 13 }}>{format(day, 'EEE d MMM')}</Text>
                    {isToday && (
                      <View style={{ borderWidth: 1, borderColor: p.brand, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.6, color: p.brand, textTransform: 'uppercase' }}>Today</Text>
                      </View>
                    )}
                    {isFuture && <Text style={{ fontSize: 10, color: p.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>Upcoming</Text>}
                  </View>
                  {recorded && recorded.total_takings > 0 ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                      <Text style={{ fontSize: 11, color: p.textMuted }}>{formatCurrency(recorded.total_takings)} total</Text>
                      {recorded.hot_drinks_sales > 0 && <Text style={{ fontSize: 11, color: hotColor }}>☕ {formatCurrency(recorded.hot_drinks_sales)}</Text>}
                      {recorded.iced_drinks_sales > 0 && <Text style={{ fontSize: 11, color: icedColor }}>🧊 {formatCurrency(recorded.iced_drinks_sales)}</Text>}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>{isFuture ? 'Not yet' : 'Tap to enter takings'}</Text>
                  )}
                </View>
                {!readOnly && <Text style={{ color: p.textFaint, fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</Text>}
              </TouchableOpacity>

              {isExpanded && !readOnly && (
                <View style={{ padding: 14, paddingTop: 4, backgroundColor: isToday ? todayBg : p.surfaceAlt, gap: 12 }}>
                  {/* Total */}
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>Total Takings *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: p.border, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: p.surface }}>
                      <Text style={{ color: p.textMuted, marginRight: 4 }}>£</Text>
                      <TextInput
                        value={inp.total_takings}
                        onChangeText={(v) => updateInput(dateStr, 'total_takings', v)}
                        keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={p.textFaint}
                        style={{ flex: 1, fontSize: 16, fontWeight: '600', color: p.text, padding: 0 }}
                      />
                    </View>
                  </View>

                  {/* Iced (0%) first, then Hot (20%) — 0% rate is more useful
                      to surface left-of-pen for traders entering a quick split. */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: icedColor, marginBottom: 6, textTransform: 'uppercase' }}>🧊 Iced (0% VAT)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: icedColor, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: p.surface }}>
                        <Text style={{ color: icedColor, marginRight: 4 }}>£</Text>
                        <TextInput
                          value={inp.iced_drinks_sales}
                          onChangeText={(v) => updateInput(dateStr, 'iced_drinks_sales', v)}
                          keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={p.textFaint}
                          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: p.text, padding: 0 }}
                        />
                      </View>
                      <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2 }}>Zero rated</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: hotColor, marginBottom: 6, textTransform: 'uppercase' }}>☕ Hot (inc. VAT)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: hotColor, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: p.surface }}>
                        <Text style={{ color: hotColor, marginRight: 4 }}>£</Text>
                        <TextInput
                          value={inp.hot_drinks_sales}
                          onChangeText={(v) => updateInput(dateStr, 'hot_drinks_sales', v)}
                          keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={p.textFaint}
                          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: p.text, padding: 0 }}
                        />
                      </View>
                      <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 2 }}>20% VAT included</Text>
                    </View>
                  </View>

                  {/* Live VAT preview */}
                  {(() => {
                    const hot  = parseFloat(inp.hot_drinks_sales) || 0;
                    const iced = parseFloat(inp.iced_drinks_sales) || 0;
                    if (hot === 0 && iced === 0) return null;
                    const hotNetAmt = hot / 1.2;
                    const vatAmt    = hot - hotNetAmt;
                    const netTotal  = hotNetAmt + iced;
                    const hotSplit  = (hot + iced) > 0 ? Math.round((hot / (hot + iced)) * 100) : 0;
                    return (
                      <View style={{ backgroundColor: p.surface, padding: 10, gap: 4, borderWidth: 1, borderColor: p.border }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 2, textTransform: 'uppercase' }}>VAT Preview</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: p.textMuted }}>Iced (zero rated)</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: p.text }}>{formatCurrency(iced)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: p.textMuted }}>Hot net (ex-VAT)</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: p.text }}>{formatCurrency(hotNetAmt)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: p.textMuted }}>VAT collected</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#dc2626' }}>{formatCurrency(vatAmt)}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: p.border, marginVertical: 2 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: p.text }}>Net Revenue</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>{formatCurrency(netTotal)}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: p.textFaint, marginTop: 4 }}>Split: {hotSplit}% hot / {100 - hotSplit}% iced</Text>
                      </View>
                    );
                  })()}

                  {/* Notes */}
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: p.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>Notes</Text>
                    <TextInput
                      value={inp.notes}
                      onChangeText={(v) => updateInput(dateStr, 'notes', v)}
                      placeholder="e.g. Busy morning, slow after 3pm…" placeholderTextColor={p.textFaint}
                      multiline numberOfLines={2}
                      style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: p.text, backgroundColor: p.surface, textAlignVertical: 'top', minHeight: 60 }}
                    />
                  </View>

                  {/* Save (ink-block) */}
                  <TouchableOpacity
                    onPress={() => saveDay(dateStr, dayNum)}
                    disabled={saving === dateStr}
                    style={{ backgroundColor: p.text, paddingVertical: 14, alignItems: 'center' }}
                  >
                    {saving === dateStr ? (
                      <ActivityIndicator color={p.bg} />
                    ) : (
                      <Text style={{ color: p.bg, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>SAVE DAY {dayNum}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        </>
      )}
    </View>
  );
}
