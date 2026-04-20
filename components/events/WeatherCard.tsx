import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { differenceInDays, parseISO, eachDayOfInterval, format } from 'date-fns';

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

async function fetchSevenTimer(lat: number, lon: number): Promise<STDay[]> {
  const res = await global.fetch(
    `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`,
  );
  const data = await res.json();
  const initStr: string = data.init; // "2025061606"
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

export function WeatherCard({
  location,
  startDate,
  endDate,
  onTempFetched,
}: {
  location: string;
  startDate: string;
  endDate?: string | null;
  onTempFetched?: (avgTemp: number) => void;
}) {
  const [days, setDays] = useState<DualDay[] | null>(null);
  const [avgTemp, setAvgTemp] = useState(15);
  const [loading, setLoading] = useState(true);
  const [outOfRange, setOutOfRange] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const daysUntil = differenceInDays(parseISO(startDate), new Date());
        if (daysUntil > 14) { setOutOfRange(true); setLoading(false); return; }
        if (daysUntil < -14) { setLoading(false); return; }

        const geoRes = await global.fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
        );
        const geoData = await geoRes.json();
        if (!geoData.results?.length) { setLoading(false); return; }
        const { latitude, longitude } = geoData.results[0];

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
        onTempFetched?.(avg);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    load();
  }, [location, startDate, endDate]);

  if (loading) return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100 items-center">
      <ActivityIndicator size="small" color="#b45309" />
      <Text className="text-stone-400 text-xs mt-2">Fetching forecast…</Text>
    </View>
  );

  if (outOfRange) return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 text-sm mb-1">🌤️ Weather Forecast</Text>
      <Text className="text-stone-400 text-xs">Forecast available within 14 days of event.</Text>
    </View>
  );

  if (!days || days.length === 0) return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 text-sm mb-1">🌤️ Weather Forecast</Text>
      <Text className="text-stone-400 text-xs">
        Forecast unavailable — we couldn't match "{location}" or the providers didn't return data.
      </Text>
    </View>
  );

  const { hot, iced } = hotIcedSplit(avgTemp);
  const hasOM = days.some((d) => d.om !== null);
  const hasST = days.some((d) => d.st !== null);

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 text-base mb-1">🌤️ Weather Forecast</Text>
      {hasOM && hasST && (
        <Text className="text-stone-400 text-xs mb-3">Two independent sources — ✅ agree · ⚠️ differ</Text>
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
                flex: 1, alignItems: 'center', borderRadius: 12, overflow: 'hidden',
                borderWidth: 1, borderColor: agree === false ? '#fde68a' : '#f5f5f4',
              }}
            >
              <Text style={{ fontSize: 10, color: '#78716c', paddingTop: 5, fontWeight: '500' }}>{dayLabel}</Text>

              {/* Open-Meteo row */}
              {d.om ? (
                <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: '#fafaf9' }}>
                  <Text style={{ fontSize: 16 }}>{omEmoji(d.om.weatherCode)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>{d.om.maxTemp.toFixed(0)}°</Text>
                  <Text style={{ fontSize: 10, color: '#a8a29e' }}>{d.om.minTemp.toFixed(0)}°</Text>
                  {d.om.precipitation > 0 && (
                    <Text style={{ fontSize: 9, color: '#3b82f6', marginTop: 1 }}>
                      💧{d.om.precipitation.toFixed(1)}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: '#fafaf9', width: '100%' }}>
                  <Text style={{ fontSize: 10, color: '#d6d3d1' }}>—</Text>
                </View>
              )}

              {/* 7Timer row */}
              {hasST && (
                d.st ? (
                  <View style={{ alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, width: '100%', backgroundColor: '#f0f9ff' }}>
                    <Text style={{ fontSize: 16 }}>{stEmoji(d.st.weather)}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1917' }}>{d.st.tempC}°</Text>
                    <Text style={{ fontSize: 9, color: '#7dd3fc' }}>7T</Text>
                  </View>
                ) : (
                  <View style={{ paddingVertical: 5, alignItems: 'center', backgroundColor: '#f0f9ff', width: '100%' }}>
                    <Text style={{ fontSize: 10, color: '#bae6fd' }}>—</Text>
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
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: '#fafaf9', borderRadius: 2, borderWidth: 1, borderColor: '#e7e5e4' }} />
            <Text style={{ fontSize: 10, color: '#78716c' }}>Open-Meteo</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: '#f0f9ff', borderRadius: 2, borderWidth: 1, borderColor: '#bae6fd' }} />
            <Text style={{ fontSize: 10, color: '#78716c' }}>7Timer</Text>
          </View>
        </View>
      )}

      {/* Hot vs Iced split */}
      <Text style={{ fontSize: 12, color: '#57534e', fontWeight: '600', marginBottom: 6 }}>
        Prepare: {hot}% Hot / {iced}% Iced
      </Text>
      <View style={{ flexDirection: 'row', borderRadius: 999, overflow: 'hidden', height: 14 }}>
        <View style={{ flex: hot, backgroundColor: '#78350f' }} />
        <View style={{ flex: iced, backgroundColor: '#bae6fd' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: '#92400e' }}>☕ {hot}% Hot</Text>
        <Text style={{ fontSize: 11, color: '#0284c7' }}>🧊 {iced}% Iced</Text>
      </View>
    </View>
  );
}
