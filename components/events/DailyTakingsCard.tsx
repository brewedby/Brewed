import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { useDailyTakings } from '@/lib/queries/dailyTakings';
import { useUpsertDailyTakings } from '@/lib/mutations/dailyTakings';
import type { DailyTakings } from '@/types';

interface Props {
  eventId: string;
  startDate: string;
  endDate: string;
}

interface DayInput {
  total_takings: string;
  hot_drinks_sales: string;
  iced_drinks_sales: string;
  notes: string;
}

export function DailyTakingsCard({ eventId, startDate, endDate }: Props) {
  const { data: dailyTakings = [], isLoading } = useDailyTakings(eventId);
  const upsert = useUpsertDailyTakings(eventId);
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, DayInput>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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

    setSaving(dateStr);
    try {
      await upsert.mutateAsync({
        day_date: dateStr,
        day_number: dayNumber,
        total_takings: total,
        hot_drinks_sales: hot,
        iced_drinks_sales: iced || Math.max(0, total - hot),
        avg_temp_c: null,
        weather_code: null,
        notes: inp.notes,
      });
      setExpandedDay(null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save');
    } finally {
      setSaving(null);
    }
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
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f5f5f4', marginBottom: 12, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1c1917', padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Daily Takings</Text>
          {daysRecorded > 0 && (
            <Text style={{ color: '#fef3c7', fontSize: 12 }}>{daysRecorded}/{days.length} days recorded</Text>
          )}
        </View>
        {totalTakings > 0 && (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <View>
              <Text style={{ color: '#a8a29e', fontSize: 10 }}>Total Takings</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{formatCurrency(totalTakings)}</Text>
            </View>
            <View>
              <Text style={{ color: '#a8a29e', fontSize: 10 }}>Net Revenue</Text>
              <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 16 }}>{formatCurrency(netRevenue)}</Text>
            </View>
            <View>
              <Text style={{ color: '#a8a29e', fontSize: 10 }}>VAT Due</Text>
              <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 16 }}>{formatCurrency(vatDue)}</Text>
            </View>
          </View>
        )}
        {hotPct !== null && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#a8a29e', fontSize: 10 }}>☕ Hot {hotPct}%</Text>
              <Text style={{ color: '#a8a29e', fontSize: 10 }}>🧊 Iced {100 - hotPct}%</Text>
            </View>
            <View style={{ flexDirection: 'row', borderRadius: 999, overflow: 'hidden', height: 8 }}>
              <View style={{ flex: hotPct, backgroundColor: '#b45309' }} />
              <View style={{ flex: 100 - hotPct, backgroundColor: '#bae6fd' }} />
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#b45309" style={{ padding: 20 }} />
      ) : (
        days.map((day, index) => {
          const dateStr  = format(day, 'yyyy-MM-dd');
          const dayNum   = index + 1;
          const recorded = getRecorded(dateStr);
          const isExpanded = expandedDay === dateStr;
          const isToday  = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const inp      = getInput(dateStr);

          return (
            <View key={dateStr} style={{ borderTopWidth: 1, borderTopColor: '#f5f5f4' }}>
              <TouchableOpacity
                onPress={() => setExpandedDay(isExpanded ? null : dateStr)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: isToday ? '#fffbeb' : '#fff' }}
                activeOpacity={0.7}
              >
                <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: recorded ? '#78350f' : isToday ? '#fef3c7' : '#f5f5f4' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: recorded ? '#fff' : isToday ? '#92400e' : '#78716c' }}>D{dayNum}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontWeight: '600', color: '#1c1917', fontSize: 13 }}>{format(day, 'EEE d MMM')}</Text>
                    {isToday && <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '600', color: '#92400e' }}>Today</Text></View>}
                    {isFuture && <Text style={{ fontSize: 10, color: '#a8a29e' }}>Upcoming</Text>}
                  </View>
                  {recorded && recorded.total_takings > 0 ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                      <Text style={{ fontSize: 11, color: '#57534e' }}>{formatCurrency(recorded.total_takings)} total</Text>
                      {recorded.hot_drinks_sales > 0 && <Text style={{ fontSize: 11, color: '#92400e' }}>☕ {formatCurrency(recorded.hot_drinks_sales)}</Text>}
                      {recorded.iced_drinks_sales > 0 && <Text style={{ fontSize: 11, color: '#0284c7' }}>🧊 {formatCurrency(recorded.iced_drinks_sales)}</Text>}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>{isFuture ? 'Not yet' : 'Tap to enter takings'}</Text>
                  )}
                </View>
                <Text style={{ color: '#a8a29e', fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ padding: 14, paddingTop: 4, backgroundColor: isToday ? '#fffbeb' : '#fafaf9', gap: 12 }}>
                  {/* Total */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#57534e', marginBottom: 4 }}>Total Takings *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' }}>
                      <Text style={{ color: '#78716c', marginRight: 4 }}>£</Text>
                      <TextInput value={inp.total_takings} onChangeText={(v) => updateInput(dateStr, 'total_takings', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#a8a29e" style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#1c1917', padding: 0 }} />
                    </View>
                  </View>

                  {/* Hot + Iced */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e', marginBottom: 4 }}>☕ Hot (inc. VAT)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fffbeb' }}>
                        <Text style={{ color: '#92400e', marginRight: 4 }}>£</Text>
                        <TextInput value={inp.hot_drinks_sales} onChangeText={(v) => updateInput(dateStr, 'hot_drinks_sales', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#d97706" style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#78350f', padding: 0 }} />
                      </View>
                      <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 2 }}>20% VAT included</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#0284c7', marginBottom: 4 }}>🧊 Iced (0% VAT)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#f0f9ff' }}>
                        <Text style={{ color: '#0284c7', marginRight: 4 }}>£</Text>
                        <TextInput value={inp.iced_drinks_sales} onChangeText={(v) => updateInput(dateStr, 'iced_drinks_sales', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#7dd3fc" style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0369a1', padding: 0 }} />
                      </View>
                      <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 2 }}>Zero rated</Text>
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
                      <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 2 }}>VAT Breakdown Preview</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Hot net (ex-VAT)</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#1c1917' }}>{formatCurrency(hotNetAmt)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>VAT collected</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#dc2626' }}>{formatCurrency(vatAmt)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>Iced (zero rated)</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#1c1917' }}>{formatCurrency(iced)}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>Net Revenue</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>{formatCurrency(netTotal)}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Split: {hotSplit}% hot / {100 - hotSplit}% iced</Text>
                      </View>
                    );
                  })()}

                  {/* Notes */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#57534e', marginBottom: 4 }}>Notes (optional)</Text>
                    <TextInput value={inp.notes} onChangeText={(v) => updateInput(dateStr, 'notes', v)} placeholder="e.g. Busy morning, slow after 3pm…" placeholderTextColor="#a8a29e" multiline numberOfLines={2} style={{ borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#1c1917', backgroundColor: '#fff', textAlignVertical: 'top', minHeight: 60 }} />
                  </View>

                  {/* Save */}
                  <TouchableOpacity onPress={() => saveDay(dateStr, dayNum)} disabled={saving === dateStr} style={{ backgroundColor: '#78350f', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}>
                    {saving === dateStr ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Day {dayNum}</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
