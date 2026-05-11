import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { differenceInDays, parseISO, eachDayOfInterval, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/themeContext';
import { normalizeTradeType } from '@/lib/tradeTypeConfig';

interface OMDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  precipitation: number;
}

interface STDay {
  date: string;
  tempC: number;
  weather: string;
}

interface DualDay {
  date: string;
  om: OMDay | null;
  st: STDay | null;
}

function omEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 49) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

/** Human-readable summary of a WMO weather code. Used for the persisted
 *  weather_summary field on events; intentionally short for UI use. */
function describeWeatherCode(code: number): string {
  if (code === 0) return 'Sunny';
  if (code <= 2) return 'Mostly sunny';
  if (code === 3) return 'Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Stormy';
}

function stEmoji(w: string): string {
  if (w.includes('clear')) return '☀️';
  if (w.includes('pcloudy')) return '⛅';
  if (w.includes('mcloudy') || w.includes('cloudy')) return '☁️';
  if (w.includes('humid')) return '🌫️';
  if (w.includes('lightrain') || w.includes('oshower') || w.includes('ishower')) return '🌦️';
  if (w.includes('rain')) return '🌧️';
  if (w.includes('snow')) return '❄️';
  if (w.includes('ts')) return '⛈️';
  return '🌤️';
}

function forecastsAgree(om: OMDay, st: STDay): boolean {
  const omWet = om.weatherCode >= 50;
  const stWet = st.weather.includes('rain') || st.weather.includes('snow') || st.weather.includes('ts');
  if (omWet !== stWet) return false;
  const omAvg = (om.maxTemp + om.minTemp) / 2;
  return Math.abs(omAvg - st.tempC) <= 5;
}

function hotIcedSplit(avgTemp: number): { hot: number; iced: number } {
  if (avgTemp < 12) return { hot: 80, iced: 20 };
  if (avgTemp < 18) return { hot: 60, iced: 40 };
  if (avgTemp < 23) return { hot: 40, iced: 60 };
  return { hot: 20, iced: 80 };
}

async function geocode(location: string): Promise<{ lat: number; lng: number }> {
  try {
    const res = await global.fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=gb`,
      { headers: { 'User-Agent': 'BrewedApp/1.0' } },
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* fall through */ }

  try {
    const res = await global.fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
    );
    const data = await res.json();
    if (data.results?.length) {
      return { lat: data.results[0].latitude, lng: data.results[0].longitude };
    }
  } catch { /* fall through */ }

  return { lat: 51.5074, lng: -0.1278 };
}

async function fetchSevenTimer(lat: number, lon: number): Promise<STDay[]> {
  const res = await global.fetch(
    `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`,
  );
  const data = await res.json();
  const initStr: string = data.init;
  const initDate = new Date(
    `${initStr.slice(0, 4)}-${initStr.slice(4, 6)}-${initStr.slice(6, 8)}T${initStr.slice(8, 10)}:00:00Z`,
  );
  const byDate = new Map<string, { temps: number[]; weathers: string[] }>();
  for (const ds of data.dataseries ?? []) {
    const d = new Date(initDate.getTime() + ds.timepoint * 3_600_000);
    const key = format(d, 'yyyy-MM-dd');
    if (!byDate.has(key)) byDate.set(key, { temps: [], weathers: [] });
    const entry = byDate.get(key)!;
    entry.temps.push(ds.temp2m);
    entry.weathers.push(ds.weather);
  }
  const days: STDay[] = [];
  byDate.forEach((val, date) => {
    const avg = val.temps.reduce((a, b) => a + b, 0) / val.temps.length;
    const counts: Record<string, number> = {};
    val.weathers.forEach((w) => { counts[w] = (counts[w] ?? 0) + 1; });
    const weather = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'clear';
    days.push({ date, tempC: Math.round(avg), weather });
  });
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

const CARD_RADIUS = 14;
const CELL_RADIUS = 10;

export function WeatherCard({
  location,
  startDate,
  endDate,
  eventId,
  onTempFetched,
  tradeType,
}: {
  location: string;
  startDate: string;
  endDate?: string | null;
  eventId?: string;
  onTempFetched?: (avgTemp: number) => void;
  /** Canonical trade type. Only used to gate the "Prepare: X% Hot /
   *  Y% Iced" prep recommendation — that's drink-trade-specific and
   *  was previously shown to every trader (a wrong-type crossover). */
  tradeType?: string | null;
}) {
  // Canonicalise once so the gate below is alias-tolerant.
  const canonicalTrade = normalizeTradeType(tradeType);
  const showHotIcedSplit = canonicalTrade === 'Coffee';
  const { tokens, isDark } = useTheme();
  const p = tokens.palette;
  const [days, setDays] = useState<DualDay[] | null>(null);
  const [avgTemp, setAvgTemp] = useState(15);
  const [loading, setLoading] = useState(true);
  const [outOfRange, setOutOfRange] = useState(false);
  const onTempFetchedRef = useRef(onTempFetched);
  useEffect(() => { onTempFetchedRef.current = onTempFetched; });

  // Subtle dual-source backgrounds that work in both modes
  const omRowBg = isDark ? p.surfaceAlt : '#fafaf9';
  const stRowBg = isDark ? 'rgba(96,165,250,0.10)' : '#f0f9ff';
  const stRowBorder = isDark ? 'rgba(96,165,250,0.35)' : '#bae6fd';
  const hotColor = p.brand;
  const icedColor = isDark ? '#7dd3fc' : '#0369a1';
  const icedBg = isDark ? '#0ea5e9' : '#7dd3fc';

  useEffect(() => {
    async function load() {
      try {
        const daysUntil = differenceInDays(parseISO(startDate), new Date());
        if (daysUntil > 14) { setOutOfRange(true); setLoading(false); return; }
        if (daysUntil < -14) { setLoading(false); return; }

        let latitude: number;
        let longitude: number;

        if (eventId) {
          const { data: cached } = await supabase
            .from('events')
            .select('lat, lng')
            .eq('id', eventId)
            .single();

          if (cached?.lat != null && cached?.lng != null) {
            latitude = cached.lat;
            longitude = cached.lng;
          } else {
            const coords = await geocode(location);
            latitude = coords.lat;
            longitude = coords.lng;
            supabase.from('events').update({ lat: latitude, lng: longitude }).eq('id', eventId).then(() => {});
          }
        } else {
          const coords = await geocode(location);
          latitude = coords.lat;
          longitude = coords.lng;
        }

        const end = endDate ?? startDate;

        const [omRes, stDaysRaw] = await Promise.allSettled([
          global.fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&start_date=${startDate}&end_date=${end}&timezone=auto`,
          ).then((r) => r.json()),
          fetchSevenTimer(latitude, longitude),
        ]);

        const omDays: OMDay[] = omRes.status === 'fulfilled'
          ? (omRes.value.daily?.time ?? []).map((d: string, i: number) => ({
              date: d,
              maxTemp: omRes.value.daily.temperature_2m_max[i],
              minTemp: omRes.value.daily.temperature_2m_min[i],
              weatherCode: omRes.value.daily.weathercode[i],
              precipitation: omRes.value.daily.precipitation_sum?.[i] ?? 0,
            }))
          : [];

        const stDays: STDay[] = stDaysRaw.status === 'fulfilled' ? stDaysRaw.value : [];

        const eventDates = eachDayOfInterval({
          start: parseISO(startDate),
          end: parseISO(end),
        }).map((d) => format(d, 'yyyy-MM-dd'));

        const omMap = new Map(omDays.map((d) => [d.date, d]));
        const stMap = new Map(stDays.map((d) => [d.date, d]));

        const dual: DualDay[] = eventDates.map((date) => ({
          date,
          om: omMap.get(date) ?? null,
          st: stMap.get(date) ?? null,
        }));

        const temps = omDays.map((d) => (d.maxTemp + d.minTemp) / 2);
        const avg = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 15;

        setDays(dual);
        setAvgTemp(avg);
        onTempFetchedRef.current?.(avg);

        // Persist a weather snapshot on the event itself so the prediction
        // engine can learn from it later. Pick the dominant weather code
        // (most common across the date range) as a coarse summary, and the
        // mean temperature as the headline. Graceful fallback: if the
        // weather columns haven't been migrated yet (Postgres 42703) or
        // any other write fails, we just skip — the in-memory forecast
        // still drives the current screen.
        if (eventId && omDays.length > 0) {
          const codeCounts = new Map<number, number>();
          for (const d of omDays) {
            codeCounts.set(d.weatherCode, (codeCounts.get(d.weatherCode) ?? 0) + 1);
          }
          let dominantCode = omDays[0].weatherCode;
          let topCount = 0;
          for (const [code, count] of codeCounts) {
            if (count > topCount) { dominantCode = code; topCount = count; }
          }
          const summary = describeWeatherCode(dominantCode);
          supabase
            .from('events')
            .update({
              avg_temp_c: Math.round(avg * 10) / 10,
              weather_code: dominantCode,
              weather_summary: summary,
              weather_fetched_at: new Date().toISOString(),
            })
            .eq('id', eventId)
            .then((res) => {
              const err = res.error;
              if (!err) return;
              if (err.code === '42703') return; // columns not migrated yet
              // Don't surface — weather persistence is best-effort.
            });
        }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, [location, startDate, endDate, eventId]);

  if (loading) return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: CARD_RADIUS, padding: 16, alignItems: 'center' }}>
      <ActivityIndicator size="small" color={p.brand} />
      <Text style={{ fontSize: 12, color: p.textFaint, marginTop: 8 }}>Fetching forecast…</Text>
    </View>
  );

  if (outOfRange) return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: CARD_RADIUS, padding: 16 }}>
      <Text style={{ fontFamily: tokens.type.display, color: p.text, fontSize: 16, marginBottom: 4 }}>🌤️ Weather Forecast</Text>
      <Text style={{ fontSize: 12, color: p.textFaint }}>Forecast available within 14 days of event.</Text>
    </View>
  );

  if (!days || days.length === 0) return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: CARD_RADIUS, padding: 16 }}>
      <Text style={{ fontFamily: tokens.type.display, color: p.text, fontSize: 16, marginBottom: 4 }}>🌤️ Weather Forecast</Text>
      <Text style={{ fontSize: 12, color: p.textFaint }}>
        Forecast unavailable — we couldn't match "{location}" or the providers didn't return data.
      </Text>
    </View>
  );

  const { hot, iced } = hotIcedSplit(avgTemp);
  const hasOM = days.some((d) => d.om !== null);
  const hasST = days.some((d) => d.st !== null);

  return (
    <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: CARD_RADIUS, padding: 16 }}>
      <Text style={{ fontFamily: tokens.type.display, color: p.text, fontSize: 16, marginBottom: 4 }}>🌤️ Weather Forecast</Text>
      {hasOM && hasST && (
        <Text style={{ fontSize: 11, color: p.textFaint, marginBottom: 12 }}>
          Two independent sources — ✅ agree · ⚠️ differ
        </Text>
      )}

      {/* Per-day dual grid */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {days.map((d) => {
          const agree = d.om && d.st ? forecastsAgree(d.om, d.st) : null;
          const dayLabel = d.date.slice(5).replace('-', '/');
          return (
            <View
              key={d.date}
              style={{
                flex: 1, alignItems: 'center', borderRadius: CELL_RADIUS, overflow: 'hidden',
                borderWidth: 1, borderColor: agree === false ? p.brand : p.border,
              }}
            >
              <Text style={{ fontSize: 10, color: p.textMuted, paddingTop: 5, fontWeight: '600', letterSpacing: 0.3 }}>{dayLabel}</Text>

              {/* Open-Meteo row */}
              {d.om ? (
                <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: omRowBg }}>
                  <Text style={{ fontSize: 16 }}>{omEmoji(d.om.weatherCode)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: p.text }}>{d.om.maxTemp.toFixed(0)}°</Text>
                  <Text style={{ fontSize: 10, color: p.textFaint }}>{d.om.minTemp.toFixed(0)}°</Text>
                  {d.om.precipitation > 0 && (
                    <Text style={{ fontSize: 9, color: '#3b82f6', marginTop: 1 }}>
                      💧{d.om.precipitation.toFixed(1)}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: omRowBg, width: '100%' }}>
                  <Text style={{ fontSize: 10, color: p.textFaint }}>—</Text>
                </View>
              )}

              {/* 7Timer row */}
              {hasST && (
                d.st ? (
                  <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: stRowBg }}>
                    <Text style={{ fontSize: 16 }}>{stEmoji(d.st.weather)}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: p.text }}>{d.st.tempC}°</Text>
                    <Text style={{ fontSize: 9, color: icedColor, fontWeight: '600' }}>7T</Text>
                  </View>
                ) : (
                  <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: stRowBg, width: '100%' }}>
                    <Text style={{ fontSize: 10, color: p.textFaint }}>—</Text>
                  </View>
                )
              )}

              {/* Agree indicator */}
              {agree !== null && (
                <Text style={{ fontSize: 10, paddingBottom: 4 }}>{agree ? '✅' : '⚠️'}</Text>
              )}
            </View>
          );
        })}
      </View>

      {hasOM && hasST && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: omRowBg, borderRadius: 3, borderWidth: 1, borderColor: p.border }} />
            <Text style={{ fontSize: 10, color: p.textMuted }}>Open-Meteo</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: stRowBg, borderRadius: 3, borderWidth: 1, borderColor: stRowBorder }} />
            <Text style={{ fontSize: 10, color: p.textMuted }}>7Timer</Text>
          </View>
        </View>
      )}

      {/* Hot vs Iced split — drink-trade-specific advice. Only shown to
          Coffee traders so non-coffee businesses don't see a coffee
          prep prompt that has no bearing on their stock decisions. */}
      {showHotIcedSplit && (
        <>
          <Text style={{ fontSize: 11, color: p.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
            Prepare: {hot}% Hot / {iced}% Iced
          </Text>
          <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', height: 14 }}>
            <View style={{ flex: hot, backgroundColor: hotColor }} />
            <View style={{ flex: iced, backgroundColor: icedBg }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: hotColor }}>☕ {hot}% Hot</Text>
            <Text style={{ fontSize: 11, color: icedColor }}>🧊 {iced}% Iced</Text>
          </View>
        </>
      )}
    </View>
  );
}
