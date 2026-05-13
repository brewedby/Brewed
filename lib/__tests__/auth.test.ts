// Auth-flow pinning tests.
//
// Pure-function / file-content tests that run via `npx tsx`. Each test
// prints a pass/fail line. Run with:
//   npx tsx lib/__tests__/auth.test.ts
//
// Why these exist: the auth bugs documented in commits 6432c6e + 30ae277
// were all single-line regressions waiting to happen — easy to drop in a
// future refactor without realising. These tests assert the fixes are
// still present in source by reading the files and grepping. Cheap to
// run, and catch the bug class before it ships.

import * as fs from 'fs';
import * as path from 'path';

interface Test {
  name: string;
  pass: boolean;
  detail: string;
}

const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const SIGN_IN_PATH = path.join(ROOT, 'app', '(auth)', 'sign-in.tsx');
const AUTH_PATH    = path.join(ROOT, 'lib', 'auth.tsx');
const RESET_PATH   = path.join(ROOT, 'app', '(auth)', 'reset-password.tsx');

const signInSrc = fs.readFileSync(SIGN_IN_PATH, 'utf8');
const authSrc   = fs.readFileSync(AUTH_PATH,   'utf8');
const resetSrc  = fs.readFileSync(RESET_PATH,  'utf8');

// 1. Sign-in copy must not say "van".
//
// The original "Keep me signed in on this van" assumed every trader has
// a coffee van. The product now covers stalls, pitches, units, trailers,
// and fixed sites — the van wording was a launch blocker.
{
  // (a) Literal bad-copy string is gone.
  expect('signin_copy_no_van_literal',
    !signInSrc.includes('Keep me signed in on this van'),
    'old van copy must be removed from sign-in.tsx');

  // (b) No "signed in ... van" pattern survives anywhere on the screen
  //     (catches paraphrases like "signed in on this van" / "signed in
  //     to this van").
  expect('signin_copy_no_van_pattern',
    !/signed in[^"]*\bvan\b/i.test(signInSrc),
    'no "signed in … van" phrasing remains');

  // (c) Replacement copy is present (positive assertion so a future
  //     refactor that strips the toggle entirely fails loudly).
  expect('signin_copy_replacement_present',
    /Keep me signed in/.test(signInSrc),
    'replacement "Keep me signed in" copy present');
}

// 2. Auth signOut cleanup contract.
//
// The bug: sign-out invalidates the Supabase refresh token server-side
// but the old auth.tsx left the local copy in SecureStore alongside
// BIOMETRIC_ENABLED_KEY = 'true'. Next launch, the sign-in screen
// auto-offered "Sign in with Face ID" which 401'd with "Session expired"
// — the exact symptom the screenshots show. Separately, React Query
// kept the previous error state under ['profile', userId] (queryKey is
// identical for the same account), so even after a clean re-sign-in
// the user saw the "Couldn't load your trader profile" recovery banner
// until staleTime (5 min) elapsed.
//
// Both fixes live in lib/auth.tsx. These tests assert the source file
// contains the two cleanup calls — a smoke-test guard against a future
// refactor accidentally dropping them.
{
  // (a) signOut must clear the biometric refresh token. Without this,
  //     the next sign-in screen auto-offers Face ID against a dead
  //     token → "Session expired" alert.
  expect('signout_disables_biometric',
    /signOut\b[\s\S]*?disableBiometric\(\)/m.test(authSrc),
    'signOut must call disableBiometric to clear the stale refresh token');

  // (b) signOut must clear the React Query cache. Without this, the
  //     profile query holds its previous error state and the recovery
  //     banner shows even after a successful re-sign-in.
  expect('signout_clears_query_cache',
    /queryClient\.clear\(\)/.test(authSrc) || /qc\.clear\(\)/.test(authSrc),
    'signOut must clear React Query cache to drop stale profile errors');

  // (c) The cold-start "rememberMe=false" path must also clear the
  //     biometric token. The supabase.auth.signOut() in that path
  //     revokes the token server-side anyway; leaving the local copy
  //     in place just causes the same "Session expired" loop on the
  //     next launch.
  expect('coldstart_signout_disables_biometric',
    /rememberMe === 'false'[\s\S]{0,400}disableBiometric\(\)/.test(authSrc),
    'cold-start sign-out (rememberMe=false) must also disableBiometric');
}

// 3. Reset-password flow must route through useAuth().signOut().
//
// reset-password.tsx previously called supabase.auth.signOut() directly,
// bypassing the biometric + query-cache cleanup. After a password reset
// the old biometric token is dead, so leaving BIOMETRIC_ENABLED_KEY=true
// reproduces the "Session expired" alert. This test pins the file to
// the centralized cleanup path.
{
  // (a) Centralized signOut() is used (not the raw supabase call).
  expect('reset_password_uses_useauth_signout',
    /\bsignOut\(\)/.test(resetSrc) && /useAuth\(\)/.test(resetSrc),
    'reset-password must use useAuth().signOut() for cleanup');

  // (b) No more raw supabase.auth.signOut() in reset-password.
  expect('reset_password_no_raw_supabase_signout',
    !/supabase\.auth\.signOut\(\)/.test(resetSrc),
    'reset-password must not call supabase.auth.signOut() directly');
}

// ── Reporter ────────────────────────────────────────────────────────
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  // eslint-disable-next-line no-console
  console.log(`${tag}  ${r.name.padEnd(48)} ${r.detail}`);
  if (r.pass) pass++; else fail++;
}
// eslint-disable-next-line no-console
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
