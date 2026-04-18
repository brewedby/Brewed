import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { OverlapModal } from './OverlapModal';
import type { EventWithFinancials, ApplicationStatus } from '@/types';

// Re-export scoring helpers so legacy imports of `scoreEvent` / `ScoreResult`
// from `@/components/events/CalendarView` continue to work.
export { scoreEvent } from '@/lib/scoring';
export type { ScoreResult } from '@/lib/scoring';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── helpers ──────────────────────────────────────────────────────────────────────────────

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

// ── main CalendarView ────────────────────────────────────────────────────────────────────────────

export function CalendarView({
  events,
  refreshControl,
}: {
  events: EventWithFinancials[];
  refreshControl?: React.ReactElement<typeof RefreshControl>;
}) {
  const today = new Date();
  const router = useRouter();
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

  const monthHandlersRef = useRef({ prevMonth, nextMonth });
  useEffect(() => {
    monthHandlersRef.current = { prevMonth, nextMonth };
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) monthHandlersRef.current.nextMonth();
        else if (g.dx > 40) monthHandlersRef.current.prevMonth();
      },
    }),
  ).current;

  return (
    <View className="flex-1" {...panResponder.panHandlers}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-100">
        <TouchableOpacity onPress={prevMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
          <Text className="text-stone-600 font-bold text-lg">‹</Text>
        </TouchableOpacity>
        <Text className="font-bold text-stone-900 text-base">{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} className="w-9 h-9 items-center justify-center rounded-full bg-stone-100">
          <Text className="text-stone-600 font-bold text-lg">›</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row bg-white border-b border-stone-100 px-1">
        {DOW.map((d) => (
          <View key={d} className="flex-1 items-center py-2">
            <Text className="text-stone-400 text-xs font-semibold">{d}</Text>
          </View>
        ))}
      </View>

      <ScrollView className="flex-1 bg-stone-50" refreshControl={refreshControl}>
        {grid.map((row, ri) => (
          <View key={ri} className="flex-row px-1">
            {row.map((date, ci) => {
              if (!date) return <View key={ci} className="flex-1 m-0.5 h-16" />;
              const dayEvents = eventsOnDate(events, date);
              const ds = isoDate(date);
              const isToday = ds === todayStr;
              const hasOverlap = dayEvents.length >= 2;
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

                  <View className="flex-row flex-wrap gap-0.5">
                    {statusSet.slice(0, 3).map((status) => (
                      <View
                        key={status}
                        style={{ backgroundColor: STATUS_COLORS[status as ApplicationStatus]?.dot ?? '#94a3b8', width: 6, height: 6, borderRadius: 3 }}
                      />
                    ))}
                  </View>

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

      {selected && (
        <OverlapModal
          events={selected.events}
          allEvents={events}
          date={selected.date}
          onClose={() => setSelected(null)}
          router={router}
        />
      )}
    </View>
  );
}
