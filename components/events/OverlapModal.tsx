import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { scoreEvent } from '@/lib/scoring';
import type { EventWithFinancials } from '@/types';

interface Props {
  events: EventWithFinancials[];
  allEvents: EventWithFinancials[];
  date: string;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}

export function OverlapModal({ events, allEvents, date, onClose, router }: Props) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const isOverlap = events.length >= 2;

  const scores = useMemo(
    () => events.map((e) => ({ event: e, result: scoreEvent(e, allEvents) })),
    [events, allEvents],
  );
  const winner = isOverlap
    ? scores.reduce((best, s) => (s.result.score > best.result.score ? s : best))
    : null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: p.bg, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32, maxHeight: '85%', borderTopWidth: 2, borderTopColor: p.text }}>
          <View style={{ width: 40, height: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontFamily: tokens.type.display, fontSize: 20, color: p.text }}>
                {isOverlap ? 'Events Overlap' : 'Events on this day'}
              </Text>
              <Text style={{ color: p.textFaint, fontSize: 12, marginTop: 2 }}>{date}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ borderWidth: 1, borderColor: p.border, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: p.textMuted, fontSize: 13, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>

          {isOverlap && winner && (
            <View style={{ borderWidth: 1, borderColor: '#22c55e', backgroundColor: p.surface, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderWidth: 1, borderColor: p.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Text style={{ fontSize: 18 }}>★</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 13 }}>
                  Recommendation: <Text style={{ fontWeight: '700', color: p.text }}>{winner.event.name}</Text>
                </Text>
                <Text style={{ color: p.textMuted, fontSize: 11, marginTop: 2 }}>
                  Score {winner.result.score}/100 — {winner.result.label}
                </Text>
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {scores.map(({ event, result }) => {
              const colors = STATUS_COLORS[event.status];
              const isWinner = winner?.event.id === event.id;
              const scoreColor = result.score >= 70 ? '#22c55e' : result.score >= 40 ? p.brand : '#dc2626';
              return (
                <View
                  key={event.id}
                  style={{ marginBottom: 12, borderWidth: isWinner && isOverlap ? 2 : 1, borderColor: isWinner && isOverlap ? '#22c55e' : p.border, backgroundColor: p.surface, overflow: 'hidden' }}
                >
                  <View style={{ height: 3, backgroundColor: colors.dot }} />
                  <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        {isWinner && isOverlap && (
                          <Text style={{ fontSize: 14, marginRight: 6, color: p.brand }}>★</Text>
                        )}
                        <Text style={{ fontFamily: tokens.type.display, fontSize: 16, color: p.text, flex: 1 }} numberOfLines={2}>
                          {event.name}
                        </Text>
                      </View>
                      {isOverlap && (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 22, fontWeight: '900', color: scoreColor, fontFamily: tokens.type.display }}>{result.score}</Text>
                          <Text style={{ color: p.textFaint, fontSize: 10 }}>/ 100</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.dot }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors.dot, textTransform: 'uppercase' }}>{STATUS_LABELS[event.status]}</Text>
                      </View>
                      {isOverlap && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: p.border }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: scoreColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{result.label}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ color: p.textMuted, fontSize: 11, marginBottom: 8 }}>
                      ◉ {event.location}
                      {event.end_date && event.end_date !== event.date ? `  ·  ${event.date} → ${event.end_date}` : `  ·  ${event.date}`}
                    </Text>

                    {event.calculations.netProfit !== 0 && (
                      <Text style={{ color: p.textMuted, fontSize: 11, marginBottom: 8 }}>
                        Net:{' '}
                        <Text style={{ fontWeight: '700', color: event.calculations.netProfit >= 0 ? '#22c55e' : '#dc2626' }}>
                          {formatCurrency(event.calculations.netProfit)}
                        </Text>
                        {event.calculations.profitMargin !== 0 && (
                          <Text style={{ color: p.textFaint }}> ({formatPercent(event.calculations.profitMargin)} margin)</Text>
                        )}
                      </Text>
                    )}

                    {isOverlap && result.reasons.length > 0 && (
                      <View style={{ backgroundColor: p.surfaceAlt, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: p.border }}>
                        {result.reasons.map((r, i) => (
                          <Text key={i} style={{ color: p.textMuted, fontSize: 11, lineHeight: 16 }}>· {r}</Text>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => { onClose(); router.push(`/(tabs)/events/${event.id}`); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${event.name}`}
                      style={{ backgroundColor: p.text, paddingVertical: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: p.bg, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>OPEN EVENT →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
