import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/themeContext';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { OverlapModal } from './OverlapModal';
import type { EventWithFinancials, ApplicationStatus } from '@/types';

export { scoreEvent } from '@/lib/scoring';
export type { ScoreResult } from '@/lib/scoring';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7;
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

function eventsInMonth(events: EventWithFinancials[], year: number, month: number): EventWithFinancials[] {
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = isoDate(new Date(year, month + 1, 0));
  return events.filter((e) => {
    const start = e.date;
    const end = e.end_date ?? e.date;
    return start <= lastDay && end >= firstDay;
  });
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${monthNames[m - 1]}`;
}

export function CalendarView({
  events,
  refreshControl,
}: {
  events: EventWithFinancials[];
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
}) {
  const today = new Date();
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<{ date: string; events: EventWithFinancials[] } | null>(null);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const todayStr = isoDate(today);

  const monthEvents = useMemo(() => eventsInMonth(events, year, month), [events, year, month]);

  const eventsByUnit = useMemo(() => {
    const map = new Map<string, { unitName: string; events: EventWithFinancials[] }>();
    monthEvents.forEach((e) => {
      if (e.units.length === 0) {
        const existing = map.get('__none__');
        if (existing) existing.events.push(e);
        else map.set('__none__', { unitName: 'No unit assigned', events: [e] });
      } else {
        e.units.forEach((u) => {
          const existing = map.get(u.id);
          if (existing) existing.events.push(e);
          else map.set(u.id, { unitName: u.name, events: [e] });
        });
      }
    });
    map.forEach((group) => group.events.sort((a, b) => a.date.localeCompare(b.date)));
    return [...map.values()].sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [monthEvents]);

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
    <View style={{ flex: 1, backgroundColor: p.bg }} {...panResponder.panHandlers}>
      {/* Month navigation header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: p.surface, borderBottomWidth: 1, borderBottomColor: p.border }}>
        <TouchableOpacity
          onPress={prevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.border }}
        >
          <Text style={{ color: p.textMuted, fontWeight: '700', fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: tokens.type.display, fontSize: 18, color: p.text }}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity
          onPress={nextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.border }}
        >
          <Text style={{ color: p.textMuted, fontWeight: '700', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={{ flexDirection: 'row', backgroundColor: p.surface, borderBottomWidth: 1, borderBottomColor: p.border, paddingHorizontal: 4 }}>
        {DOW.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: p.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{d}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: p.bg }} refreshControl={refreshControl}>
        {grid.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
            {row.map((date, ci) => {
              if (!date) return <View key={ci} style={{ flex: 1, margin: 2, height: 76 }} />;
              const dayEvents = eventsOnDate(events, date);
              const ds = isoDate(date);
              const isToday = ds === todayStr;
              const hasOverlap = dayEvents.length >= 2;
              const statusSet = [...new Set(dayEvents.map((e) => e.status))];
              const hasEvents = dayEvents.length > 0;

              return (
                <TouchableOpacity
                  key={ci}
                  onPress={() => hasEvents && setSelected({ date: ds, events: dayEvents })}
                  activeOpacity={hasEvents ? 0.7 : 1}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hasEvents
                      ? `${date.getDate()} ${MONTHS[month]}, ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}`
                      : `${date.getDate()} ${MONTHS[month]}, no events`
                  }
                  accessibilityState={{ disabled: !hasEvents }}
                  style={{
                    flex: 1, margin: 2, height: 76, padding: 6,
                    borderWidth: isToday ? 2 : 1,
                    borderColor: isToday ? p.brand : p.border,
                    backgroundColor: isToday ? p.brandSoft : p.surface,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isToday ? p.brandText : p.text }}>
                      {date.getDate()}
                    </Text>
                    {hasOverlap && (
                      <View style={{ borderWidth: 1, borderColor: '#dc2626', paddingHorizontal: 4 }}>
                        <Text style={{ color: '#dc2626', fontSize: 9, fontWeight: '700' }}>!</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                    {statusSet.slice(0, 4).map((status) => (
                      <View
                        key={status}
                        style={{
                          backgroundColor: STATUS_COLORS[status as ApplicationStatus]?.dot ?? p.textFaint,
                          width: 7, height: 7,
                        }}
                      />
                    ))}
                  </View>

                  {dayEvents.length === 1 && (
                    <Text
                      style={{ fontSize: 10, marginTop: 3, fontWeight: '500', color: isToday ? p.brandText : p.textMuted }}
                      numberOfLines={2}
                    >
                      {dayEvents[0].name}
                    </Text>
                  )}
                  {dayEvents.length > 1 && (
                    <Text style={{ fontSize: 10, marginTop: 3, fontWeight: '700', color: isToday ? p.brandText : p.text }}>
                      {dayEvents.length} events
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: p.surface, padding: 12, borderWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['accepted', 'pending', 'waitlisted'] as ApplicationStatus[]).map((s) => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: STATUS_COLORS[s].dot, paddingHorizontal: 8, paddingVertical: 3, gap: 5 }}>
                <View style={{ width: 6, height: 6, backgroundColor: STATUS_COLORS[s].dot }} />
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: STATUS_COLORS[s].dot, textTransform: 'uppercase' }}>{STATUS_LABELS[s]}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 3, gap: 5 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#dc2626' }}>!</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#dc2626', textTransform: 'uppercase' }}>Conflict</Text>
            </View>
          </View>
        </View>

        {monthEvents.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 32 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: p.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              {MONTHS[month]} · {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
            </Text>
            {eventsByUnit.map((group, gi) => (
              <View key={gi} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: p.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {group.unitName}
                </Text>
                {group.events.map((e) => {
                  const colors = STATUS_COLORS[e.status as ApplicationStatus];
                  return (
                    <TouchableOpacity
                      key={e.id}
                      onPress={() => router.push(`/(tabs)/events/${e.id}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: p.surface, paddingHorizontal: 14, paddingVertical: 11,
                        marginBottom: 6, borderWidth: 1, borderColor: p.border }}
                      activeOpacity={0.7}
                    >
                      <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: colors?.dot ?? p.border, marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: p.text }} numberOfLines={1}>{e.name}</Text>
                        <Text style={{ fontSize: 11, color: p.textFaint, marginTop: 1 }}>
                          {e.end_date && e.end_date !== e.date
                            ? `${formatShortDate(e.date)} – ${formatShortDate(e.end_date)}`
                            : formatShortDate(e.date)}
                        </Text>
                      </View>
                      <View style={{ borderWidth: 1, borderColor: colors?.dot ?? p.border, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors?.dot ?? p.textMuted, textTransform: 'uppercase' }}>
                          {STATUS_LABELS[e.status as ApplicationStatus] ?? e.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
        {monthEvents.length === 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 32, marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: p.textFaint, textAlign: 'center' }}>No events in {MONTHS[month]}</Text>
          </View>
        )}
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
