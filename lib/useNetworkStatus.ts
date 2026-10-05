import { useState, useEffect } from 'react';
import { AppState } from 'react-native';

// Probe our own backend, not a third party. This used to HEAD
// www.gstatic.com every 30s, which sent every user's IP address to Google
// and contradicted the privacy policy ("We do not use Google services").
// Any HTTP response — even 401 — proves the device is online; only a
// network-level failure means offline.
const PROBE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`;
const INTERVAL_MS = 30_000;
const TIMEOUT_MS = 8_000;

async function probe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const check = () => { probe().then((ok) => { if (!cancelled) setIsOnline(ok); }); };
    const start = () => { if (!timer) { check(); timer = setInterval(check, INTERVAL_MS); } };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    // Only poll while the app is in the foreground.
    start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => { cancelled = true; stop(); sub.remove(); };
  }, []);

  return isOnline;
}
