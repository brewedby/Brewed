import { useState, useEffect, useRef } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function check() {
    try {
      const res = await fetch('https://www.gstatic.com/generate_204', {
        method: 'HEAD',
        cache: 'no-store',
      });
      setIsOnline(res.status === 204 || res.ok);
    } catch {
      setIsOnline(false);
    }
  }

  useEffect(() => {
    check();
    timerRef.current = setInterval(check, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return isOnline;
}
