import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl px-4 pt-5 pb-8 max-h-4/5">
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="font-bold text-slate-900 text-lg">
                {isOverlap ? '⚠️ Events Overlap' : '📅 Events on this day'}
              </Text>
              <Text className="text-slate-400 text-xs">{date}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="bg-slate-100 px-3 py-1.5 rounded-xl"
            >
              <Text className="text-slate-600 text-sm font-medium">Close</Text>
            </TouchableOpacity>
          </View>

          {isOverlap && winner && (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 flex-row items-center">
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Ionicons name="trophy" size={20} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-green-800 font-semibold text-sm">
                  Recommendation: <Text className="font-bold">{winner.event.name}</Text>
                </Text>
                <Text className="text-green-700 text-xs mt-0.5">
                  Score {winner.result.score}/100 — {winner.result.label}
                </Text>
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {scores.map(({ event, result }) => {
              const colors = STATUS_COLORS[event.status];
              const isWinner = winner?.event.id === event.id;
              return (
                <View
                  key={event.id}
                  className={`mb-3 rounded-2xl border overflow-hidden ${isWinner && isOverlap ? 'border-green-300' : 'border-slate-100'}`}
                >
                  <View style={{ height: 3, backgroundColor: colors.dot }} />
                  <View className="p-3">
                    <View className="flex-row items-start justify-between mb-1">
                      <View className="flex-row items-center flex-1 mr-2">
                        {isWinner && isOverlap && (
                          <Ionicons
                            name="trophy"
                            size={14}
                            color="#d97706"
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <Text className="font-bold text-slate-900 flex-1" numberOfLines={2}>
                          {event.name}
                        </Text>
                      </View>
                      {isOverlap && (
                        <View className="items-end">
                          <Text className={`text-xl font-black ${result.color}`}>{result.score}</Text>
                          <Text className="text-slate-400 text-xs">/ 100</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center gap-2 mb-2">
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.bgHex }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textHex }}>{STATUS_LABELS[event.status]}</Text>
                      </View>
                      {isOverlap && (
                        <View className="px-2 py-0.5 rounded-full bg-slate-100">
                          <Text className={`text-xs font-semibold ${result.color}`}>{result.label}</Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-slate-500 text-xs mb-2">
                      📍 {event.location}
                      {event.end_date && event.end_date !== event.date ? `  ·  ${event.date} → ${event.end_date}` : `  ·  ${event.date}`}
                    </Text>

                    {event.calculations.netProfit !== 0 && (
                      <Text className="text-slate-500 text-xs mb-2">
                        Net: <Text className={`font-semibold ${event.calculations.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(event.calculations.netProfit)}
                        </Text>
                        {event.calculations.profitMargin !== 0 && (
                          <Text className="text-slate-400"> ({formatPercent(event.calculations.profitMargin)} margin)</Text>
                        )}
                      </Text>
                    )}

                    {isOverlap && result.reasons.length > 0 && (
                      <View className="bg-slate-50 rounded-xl p-2 mb-2">
                        {result.reasons.map((r, i) => (
                          <Text key={i} className="text-slate-600 text-xs leading-relaxed">· {r}</Text>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => { onClose(); router.push(`/(tabs)/events/${event.id}`); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${event.name}`}
                      className="bg-slate-900 py-2 rounded-xl items-center"
                    >
                      <Text className="text-white text-xs font-semibold">Open Event →</Text>
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
