/**
 * Pure app-lock timing rules (no native imports, so tests can load it).
 * Used by lib/biometrics.ts and components/shared/AppLock.tsx.
 */

/** Background time after which the lock re-engages. */
export const RELOCK_AFTER_MS = 60_000;

/** Should returning to the foreground re-lock the app? */
export function shouldRelock(backgroundedAt: number | null, now: number, lockEnabled: boolean): boolean {
  if (!lockEnabled || backgroundedAt === null) return false;
  return now - backgroundedAt >= RELOCK_AFTER_MS;
}
