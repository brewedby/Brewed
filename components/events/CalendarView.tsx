import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { EventWithFinancials, ApplicationStatus } from '@/types';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon = 0
  const grid: (Date | null)[][] = [];
  let row: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    row.push(new Date(year, month, d));
    if (row.length === 7) { grid.push(row); row = []; }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null);
    grid.push(row);
  }
  return grid;
}

function eventsOnDate(events: EventWithFinancials[], date: Date): EventWithFinancials[] {
  const d = isoDate(date);
  return events.filter((e) => {
    const start = e.date;
    const end = e.end_date ?? e.date;
    return d >= start && d <= end;
  });
}

// ── scoring ───────────────────────────────────────────────────────────────────

export interface ScoreResult {
  score: number;       // 0-100
  label: string;       // e.g. "Strong Pick"
  color: string;       // tailwind text colour class
  reasons: string[];
}

const STATUS_SCORE: Record<ApplicationStatus, number> = {
  accepted: 30, waitlisted: 18, pending: 10, rejected: 0, withdrawn: 0,
};

function footfallScore(pitchFeeRange: string | null | undefined): number {
  if (!pitchFeeRange) return 5;
  const nums = pitchFeeRange.match(/\d+/g)?.map(Number) ?? [];
  const max = Math.max(...nums);
  if (max >= 3000) return 25;
  if (max >= 1500) return 20;
  if (max >= 800)  return 14;
  if (max >= 300)  return 8;
  return 4;
}

export function scoreEvent(
  event: EventWithFinancials,
  allEvents: EventWithFinancials[],
): ScoreResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Status (0–30)
  const statusPts = STATUS_SCORE[event.status] ?? 10;
  score += statusPts;
  if (event.status === 'accepted')   reasons.push('Already accepted ✓');
  if (event.status === 'waitlisted') reasons.push('Currently on waitlist');
  if (event.status === 'pending')    reasons.push('Application pending');

  // 2. Historical profit with same company (0–35)
  const past = allEvents.filter(
    (e) =>
      e.company_id &&
      e.company_id === event.company_id &&
      e.id !== event.id &&
      new Date(e.date) < new Date() &&
      e.calculations.netProfit > 0,
  );
  if (past.length > 0) {
    const avg = past.reduce((s, e) => s + e.calculations.netProfit, 0) / past.length;
    const pts = Math.min(35, Math.round(avg / 50)); // £50 avg profit = 1 pt, max 35
    score += pts;
    reasons.push(`Avg £${avg.toFixed(0)} net from ${past.length} past event${past.length > 1 ? 's' : ''} with this company`);
  } else if (event.calculations.netProfit > 0) {
    // This event already has financials
    const pts = Math.min(35, Math.round(event.calculations.netProfit / 50));
    score += pts;
    reasons.push(`£${event.calculations.netProfit.toFixed(0)} net profit recorded`);
  } else {
    score += 10; // neutral — no data
    reasons.push('No historical data for this company yet');
  }

  // 3. Estimated size from pitch fee range (0–25)
  const sizePts = footfallScore((event as any).pitchFeeRange ?? null);
  score += sizePts;
  if (sizePts >= 20) reasons.push('Large-scale event (high revenue potential)');
  else if (sizePts >= 14) reasons.push('Mid-size event');
  else reasons.push('Smaller or local event');

  // 4. Duration bonus (0–10) — multi-day = more revenue
  const days = event.end_date
    ? Math.round((new Date(event.end_date).getTime() - new Date(event.date).getTime()) / 86400000) + 1
    : 1;
  const durPts = Math.min(10, days * 3);
  score += durPts;
  if (days > 1) reasons.push(`${days}-day event (+${durPts} pts for duration)`);

  score = Math.min(100, Math.max(0, score));

  let label = 'Uncertain';
  let color = 'text-slate-500';
  if (score >= 75) { label = 'Strong Pick';   color = 'text-green-600'; }
  else if (score >= 55) { label = 'Good Option';  color = 'text-amber-600'; }
  else if (score >= 35) { label = 'Consider';     color = 'text-orange-500'; }
  else { label = 'Low Priority'; color = 'text-red-500'; }

  return { score, label, color, reasons };
}

// ── sub-components ────────────────────────────────────────────────────────────

function OverlapModal({
  events,
  allEvents,
  date,
  onClose,
}: {
  events: EventWithFinancials[];
  allEvents: EventWithFinancials[];
  date: string;
  onClose: () => void;
}) {
  const router = useRouter();
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
          {/* Handle */}
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="font-bold text-slate-900 text-lg">
                {isOverlap ? '⚠️ Events Overlap' : '📅 Events on this day'}
              </Text>
              <Text className="text-slate-400 text-xs">{date}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-slate-100 px-3 py-1.5 rounded-xl">
              <Text className="text-slate-600 text-sm font-medium">Close</Text>
            </TouchableOpacity>
          </View>

          {isOverlap && winner && (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4">
              <Text className="text-green-800 font-semibold text-sm">
                Recommendation: <Text className="font-bold">{winner.event.name}</Text>
              </Text>
              <Text className="text-green-700 text-xs mt-0.5">
                Score {winner.result.score}/100 — {winner.result.label}
              </Text>
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
                      <Text className="font-bold text-slate-900 flex-1 mr-2" numberOfLines={2}>
                        {event.name}
                      </Text>
                      {isOverlap && (
                        <View className="items-end">
                          <Text className={`text-xl font-black ${result.color}`}>{result.score}</Text>
                          <Text className="text-slate-400 text-xs">/ 100</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center gap-2 mb-2">
                      <View className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
                        <Text className={`text-xs font-medium ${colors.text}`}>{STATUS_LABELS[event.status]}</Text>
                      </View>
                      {isOverlap && (
                        <View className={`px-2 py-0.5 rounded-full bg-slate-100`}>
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

// ── main CalendarView ─────────────────────────────────────────────────────────

export function CalendarView({ events }: { events: EventWithFinancials[] }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<{ date: string; events: EventWithFinancials[] } | null>(null);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const todayStr = isoDate(today);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <View className="flex-1">
      {/* Month navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <TouchableOpacity onPress={prevMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
          <Text className="text-stone-600 font-bold text-lg">‹</Text>
        </TouchableOpacity>
        <Text className="font-bold text-stone-900 text-base">{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
          <Text className="text-stone-600 font-bold text-lg">›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View className="flex-row bg-white border-b border-stone-100 px-1">
        {DOW.map((d) => (
          <View key={d} className="flex-1 items-center py-2">
            <Text className="text-stone-400 text-xs font-semibold">{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <ScrollView className="flex-1 bg-stone-50">
        {grid.map((row, ri) => (
          <View key={ri} className="flex-row px-1">
            {row.map((date, ci) => {
              if (!date) return <View key={ci} className="flex-1 m-0.5 h-16" />;
              const dayEvents = eventsOnDate(events, date);
              const ds = isoDate(date);
              const isToday = ds === todayStr;
              const hasOverlap = dayEvents.length >= 2;
              // Group by status for dot colours
              const statusSet = [...new Set(dayEvents.map((e) => e.status))];

              return (
                <TouchableOpacity
                  key={ci}
                  onPress={() => dayEvents.length > 0 && setSelected({ date: ds, events: dayEvents })}
                  activeOpacity={dayEvents.length > 0 ? 0.7 : 1}
                  className={`flex-1 m-0.5 h-16 rounded-xl p-1.5 ${
                    isToday ? 'bg-amber-50 border border-amber-300' : 'bg-white border border-stone-100'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className={`text-xs font-semibold ${isToday ? 'text-amber-600' : 'text-stone-700'}`}>
                      {date.getDate()}
                    </Text>
                    {hasOverlap && (
                      <View className="bg-red-100 px-1 rounded">
                        <Text className="text-red-600 text-xs font-bold">!</Text>
                      </View>
                    )}
                  </View>

                  {/* Event dots */}
                  <View className="flex-row flex-wrap gap-0.5">
                    {statusSet.slice(0, 3).map((status) => (
                      <View
                        key={status}
                        style={{ backgroundColor: STATUS_COLORS[status as ApplicationStatus]?.dot ?? '#94a3b8', width: 6, height: 6, borderRadius: 3 }}
                      />
                    ))}
                  </View>

                  {/* Event name (single event only) */}
                  {dayEvents.length === 1 && (
                    <Text className="text-stone-500 text-xs mt-0.5 leading-tight" numberOfLines={1}>
                      {dayEvents[0].name}
                    </Text>
                  )}
                  {dayEvents.length > 1 && (
                    <Text className="text-stone-500 text-xs mt-0.5">{dayEvents.length} events</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View className="mx-4 mt-3 mb-6 bg-white rounded-2xl p-3 border border-stone-100">
          <Text className="text-stone-400 text-xs font-bold uppercase tracking-wide mb-2">Legend</Text>
          <View className="flex-row flex-wrap gap-3">
            {(['pending', 'waitlisted', 'accepted', 'rejected'] as ApplicationStatus[]).map((s) => (
              <View key={s} className="flex-row items-center gap-1.5">
                <View style={{ backgroundColor: STATUS_COLORS[s].dot, width: 8, height: 8, borderRadius: 4 }} />
                <Text className="text-stone-500 text-xs">{STATUS_LABELS[s]}</Text>
              </View>
            ))}
            <View className="flex-row items-center gap-1.5">
              <View className="bg-red-100 px-1 rounded">
                <Text className="text-red-600 text-xs font-bold">!</Text>
              </View>
              <Text className="text-stone-500 text-xs">Overlap</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Day detail / overlap modal */}
      {selected && (
        <OverlapModal
          events={selected.events}
          allEvents={events}
          date={selected.date}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}
