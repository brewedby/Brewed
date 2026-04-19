import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Lightweight online detection — pings Supabase health endpoint.
// Uses AppState so it re-checks whenever the app comes to foreground.
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const appState = useRef(AppState.currentState);

  async function check() {
    try {
      const res = await fetch('https://www.gstatic.com/generate_204', {
        method: 'HEAD',
        cache: 'no-store',
      });
      setIsOnline(res.ok || res.status === 204);
    } catch {
      setIsOnline(false);
    }
  }

  useEffect(() => {
    check();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        check();
      }
      appState.current = next;
    });

    const interval = setInterval(check, 30_000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
