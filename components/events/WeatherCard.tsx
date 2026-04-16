import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { differenceInDays, parseISO } from 'date-fns';

interface DayForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
}

interface WeatherData {
  days: DayForecast[];
  avgTemp: number;
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 49) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function hotIcedSplit(avgTemp: number): { hot: number; iced: number } {
  if (avgTemp < 12) return { hot: 80, iced: 20 };
  if (avgTemp < 18) return { hot: 60, iced: 40 };
  if (avgTemp < 23) return { hot: 40, iced: 60 };
  return { hot: 20, iced: 80 };
}

export function WeatherCard({ location, startDate, endDate }: { location: string; startDate: string; endDate?: string | null }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [outOfRange, setOutOfRange] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        // Check if event is within 14 days
        const daysUntil = differenceInDays(parseISO(startDate), new Date());
        if (daysUntil > 14) { setOutOfRange(true); setLoading(false); return; }
        if (daysUntil < -14) { setLoading(false); return; } // past event

        // Geocode
        const geoRes = await global.fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results?.length) { setLoading(false); return; }
        const { latitude, longitude } = geoData.results[0];

        // Weather
        const end = endDate ?? startDate;
        const weatherRes = await global.fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&start_date=${startDate}&end_date=${end}&timezone=Europe%2FLondon`);
        const wData = await weatherRes.json();
        const days: DayForecast[] = (wData.daily?.time ?? []).map((d: string, i: number) => ({
          date: d,
          maxTemp: wData.daily.temperature_2m_max[i],
          minTemp: wData.daily.temperature_2m_min[i],
          weatherCode: wData.daily.weathercode[i],
        }));
        const avgTemp = days.length > 0 ? days.reduce((s, d) => s + (d.maxTemp + d.minTemp) / 2, 0) / days.length : 15;
        setWeather({ days, avgTemp });
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    fetch();
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
      <Text className="text-stone-400 text-xs">Forecast available 14 days before event.</Text>
    </View>
  );

  if (!weather || weather.days.length === 0) return null;

  const { hot, iced } = hotIcedSplit(weather.avgTemp);

  return (
    <View className="bg-white rounded-2xl p-4 border border-stone-100">
      <Text className="font-bold text-stone-900 text-base mb-3">🌤️ Weather Forecast</Text>

      {/* Daily forecast */}
      <View className="flex-row gap-2 mb-4">
        {weather.days.map((d) => (
          <View key={d.date} className="flex-1 items-center bg-stone-50 rounded-xl py-2 px-1">
            <Text style={{ fontSize: 20 }}>{weatherEmoji(d.weatherCode)}</Text>
            <Text className="text-stone-900 text-xs font-bold mt-1">{d.maxTemp.toFixed(0)}°</Text>
            <Text className="text-stone-400 text-xs">{d.minTemp.toFixed(0)}°</Text>
          </View>
        ))}
      </View>

      {/* Hot vs Iced split */}
      <Text className="text-stone-600 text-xs font-semibold mb-1.5">Prepare: {hot}% Hot / {iced}% Iced</Text>
      <View className="flex-row rounded-full overflow-hidden h-4">
        <View style={{ flex: hot, backgroundColor: '#78350f' }} />
        <View style={{ flex: iced, backgroundColor: '#bae6fd' }} />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-amber-900">☕ {hot}% Hot</Text>
        <Text className="text-xs text-sky-600">🧊 {iced}% Iced</Text>
      </View>
    </View>
  );
}
