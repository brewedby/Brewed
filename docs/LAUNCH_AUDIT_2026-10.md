# Brewed — Pre-Launch Audit & TODO (October 2026)

**Scope:** whole repo (app, lib, components, edge functions, SQL), the **live** Supabase project (`npdlbtnyivawjaqgvpkt`, read-only inspection), dependencies, tooling and launch docs.
**Method:** automated tools (tsc, ESLint, knip, expo-doctor, npm audit, Supabase advisors, live-schema diff), then line-by-line reading of the high-risk surfaces: auth, payments, backend, data export and deletion. The parsers, forms and forecasting had a six-pass audit in July (PR #8) and were re-checked only by tooling this time.

---

## 0. TL;DR — do these before you submit

| # | What | Who | Why |
|---|---|---|---|
| 1 | **Apply `supabase/migration_019_launch_hardening.sql`** (store 2 Vault secrets first — see the file header) | You (SQL editor) | Live DB lets any user give themselves Pro for free, AND real purchases can't activate (missing columns). |
| 2 | **Deploy the 3 edge functions** (or add the 2 GitHub secrets so CI does it) | You | Deployed receipt validator is months old; URL checker was never deployed. |
| 3 | Set `ALLOWED_PRODUCT_IDS` to **both** products (or leave it unset) | You | The old checklist set Pro only → every Brewed Trader purchase would fail. |
| 4 | Create **both** subscription products in App Store Connect (Trader £5, Pro £9) | You | Paywall sells two plans; only Pro was documented. |
| 5 | Fill the privacy policy placeholders (dates, company no., jurisdiction, address) and confirm `brewedbyboon.com/privacy` + `/support` are live | You | Apple rejects broken/placeholder policy URLs. Couldn't verify from the sandbox (egress blocked). |
| 6 | Run the device smoke test in `docs/APP_STORE_LAUNCH.md` §8–9 on a new TestFlight build | You | Face ID lock, sandbox purchase/renewal, deletion and multi-device sign-out changed in this round. |

Everything else is below, prioritised.

---

## 1. Fixed in this PR

### Critical
| Finding | Fix |
|---|---|
| **Paywall bypass (live DB).** `profiles` had no guard trigger and the old permissive UPDATE policy — any signed-in user could `PATCH /profiles` with `subscription_status='active'` or `reviewer_grandfathered=true`. | Migration 019 adds the guard (now covers INSERT too). **Verified on the production Postgres** with the real `authenticated`/`service_role` roles in an aborted transaction: client writes blocked, normal edits and service-role writes allowed. |
| **Purchases couldn't activate (live DB).** `validate-apple-receipt` writes 4 columns that didn't exist (`subscription_environment`, `apple_original_transaction_id`, `apple_latest_transaction_id`, `subscription_validated_at`) → 500 after the customer paid. | Migration 019 adds them; function now fails closed if the anti-fraud lookup errors. |
| **Renewals never reached the server.** Receipts were posted only on purchase/restore, and the purchase listener registered only after the session loaded (StoreKit replays renewals at launch — before that). Paying users would hit the paywall ~24h after each billing period. | Listeners register at mount and queue until the user loads; silent receipt re-validation on launch/foreground when expiry is near/just past (throttled, never prompts for Apple ID). |

### High
| Finding | Fix |
|---|---|
| **Sign-out signed out every device.** supabase-js `signOut()` defaults to `global` scope; a staff phone with "Keep me signed in" off logged out the owner's phone and van iPad on every launch. | `scope: 'local'` everywhere except password reset (which should sign out everywhere). |
| **Face ID sign-in could never work** (stored refresh token wiped by every route back to sign-in; token rotation invalidated it anyway) — yet advertised on the paywall and in the store copy. | Replaced with a **Face ID / Touch ID app lock**: on cold start and after 60s in background, toggle in Settings → Security, offered after sign-in. No refresh token stored. |
| **Login CSRF.** Root layout accepted `brewedbyboon://#type=recovery&access_token=…` and called `setSession()` with whatever tokens the link carried (dead code since reset moved to OTP). | Handler removed. |
| **CSV export only had the top 10 events by profit** — the path the app points users to before deleting their account / for GDPR export. | Exports every event (`lib/reportCsv.ts`) with CSV formula-injection guard. |
| **Discover never auto-refreshed; URL monitoring never ran.** Both cron jobs still contained `YOUR_PROJECT_REF`/`YOUR_SERVICE_ROLE_KEY` and failed every run ("Couldn't resolve host name"); `check-application-urls` was never deployed. | Migration 019 reschedules both (secrets from Vault, not plaintext); function hardened (below). |
| Error messages from the receipt function were swallowed ("Edge Function returned a non-2xx status code"). | Client reads the JSON error body. |

### Medium
| Finding | Fix |
|---|---|
| Account deletion left uploaded files in Storage (they don't cascade) and didn't warn that the App Store subscription keeps billing. | Files deleted first; warning + "Manage Subscription" button. |
| Event edit ignored delete errors → duplicated staffing rows → double-counted costs. | Errors abort the save. |
| Paywall advertised "Advanced reports & performance trends" — no such feature (App Review 2.3.1/3.1.2 risk). | Removed. |
| `sync-directory` callable by any user with no limit (≈14 Brave queries + ~200 page fetches per tap; free tier 2,000/month) and its queries were hard-coded to 2025. | 12h global cooldown; season year computed per run. |
| `check-application-urls` would have read every user's events for anyone holding the public anon key. | Service-role callers only; skips finished events; dropped the push relay call and the duplicate directory check. |
| `useNetworkStatus` pinged `www.gstatic.com` every 30s — every user's IP sent to Google, contradicting the privacy policy. | Probes the app's own Supabase endpoint, foreground only. |
| Privacy policy described push tokens and Keychain refresh tokens the app doesn't collect; deletion/erasure text was out of date; support email was a placeholder. | Corrected. Legal placeholders left for you (see TODO). |
| `ALLOWED_PRODUCT_IDS` instruction would break Trader purchases; launch checklist listed functions that don't exist (`parse-pdf`, `discover-events`, `send-push-notification`). | `APP_STORE_LAUNCH.md` and `SETUP.md` rewritten for the real backend. |

### Low
- Forecast "today" used UTC (wrong between 00:00–01:00 BST) → local date.
- Business name typed at sign-up was discarded → pre-fills onboarding.
- Sign-up left the user on a filled-in form after "check your email" → returns to sign-in. Sign-up now requires 8-character passwords, matching password reset (was 6).
- Supabase auto-refresh now follows the React Native AppState guidance; a build missing `EXPO_PUBLIC_SUPABASE_*` now fails with a clear message.

### Dead code & dependencies removed
- 8 unused component files, 22 unused exports/hooks, unused year-filter state, unused imports (knip + ESLint, each verified by grep).
- Unused/unsafe edge functions `discover-events` and `send-push-notification` (an unauthenticated push relay — never deployed, never called).
- Dependencies: `zustand`, `@tanstack/query-async-storage-persister`, `@tanstack/react-query-persist-client`, `expo-device`; duplicate `babel-preset-expo` devDependency.
- Added `expo-file-system` explicitly (was imported but only resolvable via hoisting); aligned `expo-router`/`expo-updates` to SDK 54's expected patches.
- Deleted `codebase.md` + `repomix-output.md` (≈1 MB stale whole-repo dumps; regenerate with `npx repomix`, now git-ignored).

---

## 2. Automation added

| Tool | What it does | Setup needed |
|---|---|---|
| `npm run check` | typecheck + lint + all 16 test suites + knip. One pre-push gate. | none |
| `npm test` | `scripts/run-tests.mjs` runs every `lib/__tests__` suite (667 assertions). | none |
| **GitHub Actions CI** (`.github/workflows/ci.yml`) | On every PR/push to final-form: typecheck, ESLint, tests, knip (dead code/unused deps), Expo SDK alignment, Deno typecheck of edge functions. | none |
| **Edge-function deploys** (`deploy-edge-functions.yml`) | Deploys all 3 functions when `supabase/functions/**` changes on final-form — prevents the drift found in this audit. | Repo secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` |
| **Dependabot** | Weekly grouped minor/patch npm PRs (Expo/RN excluded — those move with SDK upgrades), monthly Actions updates. | none |
| **EAS Update** (OTA) | `app.json` `updates.url` + per-profile channels. Ship JS-only fixes to live users without App Review. | Takes effect from the next native build |
| **EAS Workflows** (`.eas/workflows/`) | `build-and-submit-ios.yml` (build → TestFlight in one command, optional on-merge trigger); `publish-update.yml` (OTA to production). | `npx eas-cli workflow:run …`; link repo in expo.dev for auto-trigger |

Current status: **0** TypeScript errors, **0** ESLint problems, **0** knip findings, **16/16** test suites passing (51 new regression assertions in `lib/__tests__/launchAudit.test.ts`).

---

## 3. TODO — before submission

**Backend (blocking)**
- [ ] Store Vault secrets `project_url` and `service_role_key` (legacy JWT), then run `migration_019_launch_hardening.sql`. If the SQL editor seems to hang, check `select * from pg_locks where not granted;` — the migration needs brief locks on `profiles`.
- [ ] Deploy `sync-directory`, `check-application-urls`, `validate-apple-receipt --no-verify-jwt` (or add the two GitHub secrets and run the "Deploy edge functions" workflow).
- [ ] `supabase secrets set ALLOWED_PRODUCT_IDS='com.brewedbyboon.app.pro.monthly,com.brewedbyboon.app.trader.monthly'` (or unset it) and confirm `APPLE_SHARED_SECRET` is set.
- [ ] Re-run Supabase **Advisors** (security + performance) — expect only `pg_net` in `public`, `rls_auto_enable` (Supabase-managed) and leaked-password protection left.
- [ ] Auth → enable **Leaked password protection**; set the minimum password length to 8 to match the app (sign-up now requires 8, as reset already did).
- [ ] Auth → Email templates: the **Magic Link / OTP** template must include `{{ .Token }}` (forgot-password asks for a 6-digit code). Confirm Site URL and "Confirm email" are set as intended.

**App Store Connect (blocking)**
- [ ] Create both subscriptions (Trader £5 + Pro £9) in one group; review screenshot of the paywall for each.
- [ ] Reviewer account `reviewer_grandfathered = true` (SQL in checklist §6 — works with the new guard because the SQL editor runs as `postgres`).
- [ ] App Privacy answers: no change needed (push token removed from policy; no tracking).

**Build config**
- [ ] Confirm EAS environment variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist for the **production** environment (`eas env:list`). `eas.json` has none, so builds depend on them.
- [ ] Consider removing `com.apple.developer.in-app-payments` from `app.json` → that entitlement is **Apple Pay**, not In-App Purchase (IAP needs no entitlement). Harmless if it already builds, but it enables an unused capability.
- [ ] `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` describe features the app doesn't use (it uses the document picker). Remove or keep — unused purpose strings occasionally draw reviewer questions.
- [ ] Optional before the build: `npx expo install --fix` applies 4 SDK 54 patch updates CI flagged (`expo` 54.0.35→54.0.37, `expo-constants`, `expo-file-system`, `expo-local-authentication`). Patch-level, but they change the native binary — do it before the TestFlight build you test, not after.
- [ ] New native build required (app lock, IAP listener, EAS Update config, dependency changes) → TestFlight.

**Legal / web**
- [ ] Privacy policy: fill effective/updated dates, company number, jurisdiction, registered address (`docs/PRIVACY_POLICY.md` lines 3–5, 201); publish to `brewedbyboon.com/privacy`.
- [ ] Support page live at `brewedbyboon.com/support`.

**Device test pass** (new build, sandbox tester) — see `docs/APP_STORE_LAUNCH.md` §8–9. New items this round:
- [ ] Face ID lock: cold start, 1-min background re-lock, quick app-switch does *not* lock, Settings toggle, "Sign out and use password".
- [ ] Subscribe (Trader and Pro), restore, wait for sandbox renewal (5 min) — profile `subscription_expires_at` advances without tapping Restore.
- [ ] Sign out on phone → iPad stays signed in.
- [ ] CSV export contains every event.
- [ ] Delete a throwaway account → subscription warning shown; its Storage files are gone.

---

## 4. TODO — after launch (prioritised)

1. **App Store Server Notifications V2** handler — instant renewals/refunds/cancellations without relying on the app being opened. (The silent re-validation covers active users; this covers everyone.)
2. **Migrate off `/verifyReceipt`** (deprecated by Apple since 2023) to the App Store Server API with StoreKit 2 JWS — also removes the base64-receipt workaround in `SubscriptionContext`.
3. **Track migrations properly**: move `supabase/migration_*.sql` into `supabase/migrations/<timestamp>_*.sql` and apply with `supabase db push` from CI. The live DB had silently drifted from the repo — this is the root cause of the two critical findings.
4. **Schema-drift check in CI**: `supabase gen types typescript --project-id …` and diff against `types/database.ts` (needs the access token secret).
5. Show fleet reminders while the app is open (`Notifications.setNotificationHandler`) and cancel scheduled reminders when a Pro user downgrades to Trader.
6. Crash visibility: Xcode Organizer / App Store Connect crash reports are free and need no SDK (the privacy policy rules out third-party crash reporters).
7. `npm audit` reports 34 advisories — all in build/dev tooling (Expo CLI, Metro, `ws`, `tar`…), none ship in the app bundle. They clear with the next Expo SDK upgrade; Dependabot will surface the rest.
8. Android: `expo-system-ui` (for `userInterfaceStyle: automatic`) and Google Play Billing, if/when Android ships.
9. Move `pg_net` out of the `public` schema (advisor; low risk, do during a quiet window).

---

## 5. What was checked and found OK
- RLS enabled on all 17 public tables; every policy scopes to the owner; storage buckets private with per-user folder policies; all user tables cascade from `auth.users` (deletion is complete apart from Storage, now handled).
- `delete_own_account()` is SECURITY DEFINER with locked `search_path` and only deletes `auth.uid()`.
- No secrets in the repo; service-role key never in the app; no analytics/ad SDKs.
- Paywall has price, period, auto-renew terms, Restore, Terms (Apple EULA) and Privacy links.
- In-app account deletion present (5.1.1(v)).
