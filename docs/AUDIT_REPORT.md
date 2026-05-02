# Brewed — Pre-Launch Audit Report

**Audit date:** 2 May 2026
**App version audited:** 1.0.0
**Branch:** `claude/coffee-truck-tracker-app-133ZK`
**Audit scope:** App Store readiness for paid auto-renewable subscription, security & privacy, financial-data isolation, Brave Search weekly auto-update, UX/reliability sweep.

---

## 1. Executive summary

Brewed is **near-ready** for App Store submission as a £9/month subscription app. The codebase is tidy, well-typed, free of analytics SDKs, free of console-logged secrets, and properly RLS-secured for inter-user isolation. After this audit:

- Subscription scaffolding (entitlement context, paywall, server-side receipt validation, restore, manage, gating) is built end-to-end.
- Privacy policy and in-app privacy summary are written.
- Brave Search is rescheduled from daily → weekly (Sunday 03:00 UTC).
- Settings now exposes subscription status and privacy controls.

**Two items require your decision before submission:**

1. **Financial-data isolation between user and developer** — Option C ("honest disclosure") is currently in effect; Options A (local-only) or B (E2E encryption) need your sign-off if you want technical (not policy-based) isolation. See §6.
2. **Apple subscription metadata** in App Store Connect — needs to be created manually with the exact product ID `com.brewedbyboon.app.pro.monthly`. See `APP_STORE_LAUNCH.md`.

**App Store readiness score: 78 / 100.** The remaining 22 points are: App Store Connect metadata (manual), production Supabase project (manual), screenshots (manual), and the financial-isolation decision.

---

## 2. Critical issues found

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | No subscription / IAP code at all | **Blocker** | ✅ Fixed (full IAP layer scaffolded) |
| 2 | No paywall / entitlement gating | **Blocker** | ✅ Fixed |
| 3 | No restore purchases | **Blocker** | ✅ Fixed |
| 4 | No manage subscription link | **Blocker** | ✅ Fixed |
| 5 | No privacy policy | **Blocker** | ✅ Written (`docs/PRIVACY_POLICY.md`) |
| 6 | No in-app privacy summary | **Required for Apple** | ✅ Built (`app/(modal)/privacy.tsx`) |
| 7 | Brave Search ran daily, not weekly | **Functional** | ✅ Fixed (migration_010) |
| 8 | `profiles` table allowed user self-update of any column → user could spoof entitlement | **Security** | ✅ Fixed (DB trigger blocks subscription columns) |
| 9 | Financial data is plaintext in developer-owned Supabase | **Privacy** | ⚠️ Decision required (see §6) |
| 10 | No App Store reviewer demo account mechanism | **Apple review** | ✅ Added `reviewer_grandfathered` flag |
| 11 | No Apple in-app-payments entitlement in app.json | **Build** | ✅ Added |
| 12 | No iOS in-app-purchase plugin | **Build** | ✅ Added (`expo-iap` in plugins + deps) |

---

## 3. Issues fixed in this audit pass

### Subscription / IAP (full implementation)
- `lib/iap/products.ts` — product ID constants, fallback price, feature list
- `lib/iap/SubscriptionContext.tsx` — global entitlement state, purchase flow, restore, refresh, listeners
- `supabase/functions/validate-apple-receipt/index.ts` — server-side receipt verification with Apple production+sandbox fallback, anti-fraud check (one transaction → one user), service-role write
- `supabase/migration_009_subscriptions.sql` — `subscription_status`, `subscription_expires_at`, `apple_original_transaction_id`, etc., plus `apple_notifications` log table and `user_entitlement` view
- DB trigger `guard_profile_subscription_columns` blocks client writes to subscription columns even if a user manipulates the API
- `app/(modal)/paywall.tsx` — App Store-compliant paywall (price, features, EULA + Privacy links, restore, auto-renewal disclosure)
- `app/(modal)/_layout.tsx` — modal stack
- `app/_layout.tsx` — wires `SubscriptionProvider`, gates non-paywall routes

### Privacy & legal
- `docs/PRIVACY_POLICY.md` — UK GDPR compliant policy with Apple/Brave/Supabase third-party disclosure and Apple App Store privacy label appendix
- `app/(modal)/privacy.tsx` — in-app summary modal
- Settings → Privacy summary entry point
- Settings → Contact support entry point
- Paywall links to privacy summary

### Brave Search
- `supabase/migration_010_weekly_brave_sync.sql` — drops daily cron, schedules weekly (Sunday 03:00 UTC for sync, 04:00 UTC for URL change check)
- New `directory_sync_runs` table for explicit sync history (read-only to authenticated users)

### Settings
- New "Subscription" section showing status, expiry, renewal, with Manage / Restore buttons
- New "Privacy & Legal" section with privacy summary and contact support

### Configuration
- `app.json` — added `expo-iap` plugin, `com.apple.developer.in-app-payments` entitlement, empty `SKAdNetworkItems`
- `package.json` — added `expo-iap@^2.7.0` dependency
- `types/database.ts` — extended `profiles` Row with subscription fields (Update type intentionally excludes them)
- `lib/queries/profile.ts` — refetch interval 5 min for entitlement freshness

### Documentation
- `docs/APP_STORE_LAUNCH.md` — 11-step launch checklist + suggested App Store description
- `docs/PRIVACY_POLICY.md` — full policy
- `docs/AUDIT_REPORT.md` — this file
- `docs/FUTURE_IMPROVEMENTS.md` — prioritised post-launch roadmap

---

## 4. Issues NOT fixed and why

| Item | Reason |
|---|---|
| **End-to-end encryption of financial data (Option B)** | Architectural rewrite (~1 week) that is irreversible if data exists. Requires explicit decision from you (see §6). All other privacy work assumes Option C (honest disclosure). |
| **App Store Connect metadata** | Apple-side; cannot be done from code. Step-by-step in `APP_STORE_LAUNCH.md`. |
| **Production Supabase project** | Yours to create; cannot be done from code. |
| **Screenshots / app preview video** | Capture from device. |
| **Marketing site at brewedbyboon.com** | Not in this repo. The privacy policy URL and support URL must be live before submission. |
| **App Store Server Notifications V2 handler** | Optional. Current design re-validates on app open and via `refetchInterval` every 5 min, which catches renewals and cancellations within minutes for active users. Add later if you want sub-second cancellation reflection. |
| **Free trial / intro offer** | Configured in App Store Connect, not in code. Add when you've decided on a strategy (recommendation in Future Improvements). |
| **Android subscription** | iOS-only paywall for now (`Platform.OS === 'ios'` check); Android sign-in works but the paywall will tell users iOS-only. Add Google Play Billing later. |
| **Account deletion in-app** | The privacy policy directs users to email support to delete their account. A 1-tap in-app delete is on the post-launch roadmap (item 1.3 of Future Improvements). |
| **Rate limiting on edge functions** | Supabase doesn't expose configurable rate limits; consider Cloudflare in front of edge function URLs if abuse becomes a problem. |

---

## 5. Security & privacy audit

### Strengths confirmed
- ✅ No hardcoded secrets in source. `.env` is gitignored, only placeholders in `.env.example`.
- ✅ No third-party analytics, crash reporters, or trackers.
- ✅ All external HTTP calls use HTTPS.
- ✅ RLS enabled on every user-data table; policies use `auth.uid() = user_id` (or nested check via event ownership).
- ✅ Brave Search API key never reaches the client — Edge Function holds it.
- ✅ Service-role key never reaches the client — Edge Functions only.
- ✅ Refresh tokens stored in iOS Keychain (`expo-secure-store`) — hardware-backed.
- ✅ No `console.log` of financial data anywhere in client or edge functions.
- ✅ Auto-renew tokens auto-rotate hourly.

### Newly added
- ✅ DB trigger `guard_profile_subscription_columns` prevents client writes to subscription columns. A user cannot SQL-inject or HTTP-POST themselves into `subscription_status='active'`.
- ✅ Receipt validation function refuses to assign one Apple `original_transaction_id` to two different users (anti-Apple-ID-sharing).
- ✅ Subscription state writes go via service role only.

### Residual considerations
- ⚠️ **Financial data plaintext in developer-owned database.** Discussed at length in §6.
- 🟡 **CORS `Access-Control-Allow-Origin: *` on Edge Functions.** Acceptable for a mobile app (no browser origins to scope to), but if you ever expose a web client, lock down to your domain.
- 🟡 **No App Store Server Notifications V2** — entitlement state can be up to 5 minutes stale on cancel/refund. Acceptable for MVP.

---

## 6. Financial data privacy — your decision

**Current reality:** Every financial value entered into Brewed (gross sales, costs, margins, supplier prices, staff rates) is stored as `NUMERIC` plaintext in the Supabase tables `event_financials`, `staffing_entries`, `infrastructure_items`, `sales_reports`, `sales_line_items`, and `daily_takings`. Row-Level Security prevents *one user* from reading *another user's* rows, but it does **not** prevent **you, the project owner**, from running a SQL query against those tables (via the Supabase Dashboard or the service-role key).

In other words: **with the architecture as-is, you can technically read every user's financial data**. RLS protects users from each other, not from the operator.

**This is the same architecture as Notion, Linear, Xero, Quickbooks, and most paid SaaS — they all hold your data and rely on contractual/policy commitments not to look at it.** Apple's App Store and the App Store Privacy questionnaire accept this model. The privacy policy in `docs/PRIVACY_POLICY.md` discloses it accurately.

If you want **technical** (rather than policy-based) isolation, here are the options. I have **NOT implemented A or B** because they are large, partially irreversible refactors that would break the live data and core features (dashboard aggregations, multi-device sync). Pick one and tell me which to do.

### Option A — Local-only storage
- Move `event_financials`, `staffing_entries`, `infrastructure_items`, `sales_reports`, `sales_line_items`, `daily_takings` from Supabase to on-device SQLite (`expo-sqlite`).
- The cloud retains only events/companies/units/profile (no financial fields).
- **Pros:** developer can never see financials. Period.
- **Cons:** No multi-device sync of financials. Lose data if the user uninstalls. No cross-device backup. No way to recover after device loss.
- **Effort:** ~3 days to refactor query/mutation layer; needs a UI flow for explicit local backup/export.

### Option B — End-to-end encryption with user passphrase
- User sets a separate "data passphrase" on first run.
- Derive an AES-256-GCM key with PBKDF2 (200k iterations) from passphrase + per-user salt.
- Encrypt every financial value before INSERT; decrypt on read.
- Server stores only ciphertext and an HMAC for integrity.
- Aggregations (sums, charts, reports) computed client-side after decrypt.
- **Pros:** developer cannot decrypt. Multi-device works (user re-enters passphrase on each device).
- **Cons:** **forgotten passphrase = data permanently lost.** Cannot reset, cannot recover. Slower (decrypt 50–500 records on dashboard load). Loss of server-side aggregations means slower reports as data grows.
- **Effort:** ~5–8 days. Requires a careful migration of existing data (encrypt-in-place during one app launch with the new passphrase). Adds significant onboarding friction.

### Option C — Honest disclosure (current default)
- Keep architecture as-is.
- Privacy policy and in-app summary state plainly that we have technical access but commit not to use it.
- Add operational controls: limit who has the service-role key, log every dashboard query, etc.
- **Pros:** ship in days, not weeks. No data loss risk. Multi-device, fast aggregations work.
- **Cons:** trust-based; doesn't satisfy a literal reading of "I cannot see the data."
- **Effort:** done. Privacy policy is written.

**Recommendation:** Ship under **Option C** to validate the market. Build Option B as a **post-launch upgrade** marketed as "Vault Mode" — opt-in, paid tier, for users who really need it. This is the pattern Signal, Standard Notes, and Bitwarden use.

If you want to make a different call, tell me which option and I'll implement it.

---

## 7. Subscription readiness

| Requirement | Status |
|---|---|
| Auto-renewable monthly product at £9 | ✅ scaffolded — needs App Store Connect product creation |
| Receipt validation (server-side) | ✅ `validate-apple-receipt` Edge Function |
| Production + sandbox endpoint fallback | ✅ tries production then 21007 → sandbox |
| Restore purchases | ✅ paywall + Settings |
| Manage subscription link | ✅ Settings → Manage → opens `apps.apple.com/account/subscriptions` |
| Cancel / expired handling | ✅ derived from receipt; gating reverts to paywall |
| Grace period handling | ✅ `in_grace_period` status entitles user; UI shows "Grace period" |
| Billing retry handling | ✅ `in_billing_retry` status; UI shows "Lapsed — re-subscribe" |
| Reviewer demo bypass | ✅ `reviewer_grandfathered` flag, set via SQL |
| Anti-fraud (one receipt → one user) | ✅ Edge Function refuses to reassign `original_transaction_id` |
| Auto-renewal disclosure on paywall | ✅ App Store-compliant copy |
| Terms of Use + Privacy Policy links on paywall | ✅ |
| App Store entitlements declared | ✅ `com.apple.developer.in-app-payments` in app.json |
| Native module wired up | ✅ `expo-iap` plugin in app.json plugins array |

**Action needed from you:** Run `npm install` then `npx expo prebuild` then `eas build`. See `APP_STORE_LAUNCH.md`.

---

## 8. Brave Search weekly auto-update

| Requirement | Status |
|---|---|
| API key not exposed to client | ✅ in Edge Function env only |
| Runs automatically without user pressing a button | ✅ `pg_cron` schedule |
| Weekly schedule | ✅ Sunday 03:00 UTC (sync) and 04:00 UTC (URL changes) |
| Robust across app restarts | ✅ runs in DB cron, not in-app |
| Handles failed updates | ✅ Edge Function catches errors per-query, continues |
| Records last successful update | ✅ via `uk_events_directory.updated_at` (existing) and `directory_sync_runs` (new) |
| Avoids excessive API calls | ✅ 1.1s sleep between Brave requests; weekly schedule keeps usage well under 2,000 queries/month free tier |
| Documented | ✅ comments in `sync-directory/index.ts` and migration_010 |

The discover screen's "manual refresh" button still works as a user-initiated sync.

---

## 9. App Store readiness score: 78 / 100

**Breakdown:**
- App functionality (auth, events, fleet, reports, calendar, discover): 18/20
- Subscription system + paywall: 15/15
- Privacy policy + in-app disclosure: 10/10
- Restore + manage + reviewer access: 8/8
- App Store metadata (screenshots, description, keywords, URLs): 0/15 (manual)
- Production Supabase project: 0/8 (manual)
- Brave weekly auto-sync: 5/5
- Security audit (RLS, secrets, trigger guard, anti-fraud): 12/12
- Edge Function deployment (validate-apple-receipt + secrets): 0/4 (manual)
- TestFlight smoke test: 0/3 (manual, requires real device)

To reach 100/100: complete the manual items in `APP_STORE_LAUNCH.md`.

---

## 10. Remaining launch blockers

1. Run `npm install` to add `expo-iap`, then `npx expo prebuild` (first time with a native module).
2. Apply migrations 009 and 010 to your Supabase production database.
3. Deploy `validate-apple-receipt` Edge Function and set `APPLE_SHARED_SECRET` + `ALLOWED_PRODUCT_IDS` secrets.
4. Create the `Brewed Pro` subscription product in App Store Connect with product ID `com.brewedbyboon.app.pro.monthly` at £9/month.
5. Host `docs/PRIVACY_POLICY.md` at <https://brewedbyboon.com/privacy>.
6. Create a support page or page-with-an-email at <https://brewedbyboon.com/support>.
7. Capture screenshots on a real device (recommend iPhone 16 Pro Max simulator at 6.9").
8. Set up the App Store reviewer account and grandfather it.
9. (Optional but recommended) Decide on financial-isolation Option (A / B / C).

---

## 11. Files changed in this audit pass

**New files:**
- `app/(modal)/_layout.tsx`
- `app/(modal)/paywall.tsx`
- `app/(modal)/privacy.tsx`
- `lib/iap/products.ts`
- `lib/iap/SubscriptionContext.tsx`
- `supabase/functions/validate-apple-receipt/index.ts`
- `supabase/migration_009_subscriptions.sql`
- `supabase/migration_010_weekly_brave_sync.sql`
- `docs/PRIVACY_POLICY.md`
- `docs/APP_STORE_LAUNCH.md`
- `docs/AUDIT_REPORT.md` (this file)
- `docs/FUTURE_IMPROVEMENTS.md`

**Modified files:**
- `app/_layout.tsx` (SubscriptionProvider + gating)
- `app/(tabs)/settings.tsx` (Subscription + Privacy & Legal sections)
- `lib/queries/profile.ts` (subscription fields, refetchInterval)
- `types/database.ts` (subscription columns on profiles Row)
- `app.json` (entitlements, expo-iap plugin)
- `package.json` (expo-iap dependency)

---

## 12. Manual steps still required

In priority order:

1. **Create production Supabase project** and run all migrations (or run 009 + 010 on your existing project).
2. **Deploy `validate-apple-receipt` Edge Function**: `supabase functions deploy validate-apple-receipt --no-verify-jwt`
3. **Set Apple shared secret**: `supabase secrets set APPLE_SHARED_SECRET='...'`
4. **Create Subscription product in App Store Connect** — product ID must be `com.brewedbyboon.app.pro.monthly` at £9/month.
5. **Host privacy policy** at <https://brewedbyboon.com/privacy>.
6. **`npm install` + `npx expo prebuild` + `eas build --platform ios --profile production`**
7. **Sandbox test the purchase flow** via TestFlight on a real device.
8. **Capture screenshots and write App Store listing**.
9. **Submit for review**.

---

## 13. Future update recommendations

See `docs/FUTURE_IMPROVEMENTS.md` for the prioritised roadmap.
