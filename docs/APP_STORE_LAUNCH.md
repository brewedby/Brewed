# Brewed — App Store Launch Checklist

Step-by-step path from "code on your Mac" to "live on the App Store with paying subscribers." Items marked **[Manual]** require you to do them in App Store Connect, the Supabase Dashboard, or your terminal — they cannot be done in code.

---

## 1. Apple Developer setup [Manual]

- [ ] Apple Developer Program membership active (£79/year, 24–48hr activation). Already arranged if your `eas.json` lists `appleId` and `appleTeamId TN2433BJWJ`.
- [ ] App identifier `com.brewedbyboon.app` exists in [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → Identifiers → Add. **Critically: enable the "In-App Purchase" capability** for this identifier.
- [ ] Distribution certificate + provisioning profile generated. `eas build` handles this automatically; let it create them on first build.

---

## 2. App Store Connect — create the app record [Manual]

Open [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → "+".

- [ ] Bundle ID: `com.brewedbyboon.app`
- [ ] App Name: **Brewed**
- [ ] Primary language: English (U.K.)
- [ ] SKU: `BREWED-001` (internal, your choice)
- [ ] User Access: Full Access
- [ ] Apple App ID (numeric): paste into `eas.json` if not already (currently `6764655317` ✓)

### App Information
- [ ] Subtitle (≤30 chars): **Mobile trader event ledger**
- [ ] Category: Primary **Business**, Secondary **Productivity**
- [ ] Content Rights: confirm you don't use third-party content
- [ ] Age rating questionnaire → results in **4+**

### Pricing & Availability
- [ ] Price: **Free** (the app is free to download; subscription is in-app)
- [ ] Availability: All countries, or restrict to UK first (recommended for v1)

### App Store Listing (per locale)
- [ ] App name: **Brewed**
- [ ] Subtitle: **Mobile trader event ledger**
- [ ] Promotional Text (170 chars, can change without re-review):
  > Festival season ahead? Brewed keeps every application, fee, and margin in one ledger so you arrive at the pitch knowing the numbers.
- [ ] Description (4000 chars max). Suggested copy at the bottom of this file.
- [ ] Keywords (100 chars): `food truck,festival,coffee van,trader,catering,events,P&L,VAT,application,markets`
- [ ] Support URL: <https://brewedbyboon.com/support> (must exist before submission)
- [ ] Marketing URL (optional): <https://brewedbyboon.com>
- [ ] Privacy Policy URL: <https://brewedbyboon.com/privacy> (must exist; host the contents of `docs/PRIVACY_POLICY.md`)
- [ ] Copyright: `© 2026 Brewed by Boon Ltd`

### Screenshots (required)
- [ ] iPhone 6.9" (e.g. iPhone 16 Pro Max simulator) — minimum 3, recommend 6 covering: Dashboard sealed/open, Event detail with financials, Discover, Reports, Calendar, Settings.
- [ ] iPhone 6.5" (e.g. iPhone 11 Pro Max simulator) — Apple may auto-scale from 6.9" or you can upload separate captures.
- [ ] iPad Pro 13" — recommended since you ship `supportsTablet: true`.

### App Preview video (optional but recommended)
- [ ] 15–30s landscape MP4. Apple boost.

---

## 3. Subscription setup [Manual]

App Store Connect → My Apps → Brewed → **Monetization → Subscriptions**.

### Subscription group
- [ ] Reference name: `Brewed Pro` (group reference name — internal)
- [ ] Subscription Group Display Name: `Brewed Pro` (user-visible)

### Add a subscription to the group
- [ ] Reference name: `Brewed Pro Monthly`
- [ ] **Product ID**: `com.brewedbyboon.app.pro.monthly`  ← **must match** `lib/iap/products.ts` exactly.
- [ ] Subscription duration: **1 month**
- [ ] Subscription price: **£9.00** in United Kingdom; let App Store Connect auto-convert other tiers, or set per-territory if you prefer.
- [ ] Localizations (English UK):
  - Display name: **Brewed Pro**
  - Description (≤45 chars): **Track every event, fee, and margin.**
- [ ] Review screenshot (required): a screenshot of your paywall screen (1242×2688 or any iPhone size). Take with the simulator — `app/(modal)/paywall.tsx` is the screen.
- [ ] Review notes: paste the demo account credentials (see §6).

### App-specific shared secret
- [ ] App Store Connect → Brewed → App Information → App-Specific Shared Secret → **Generate**.
- [ ] Copy the value, then in your terminal:
  ```bash
  supabase secrets set APPLE_SHARED_SECRET='paste-it-here'
  supabase secrets set ALLOWED_PRODUCT_IDS='com.brewedbyboon.app.pro.monthly'
  ```

### Optional: free trial / intro offer
- [ ] If you want to offer a 7-day free trial: in the subscription, add an **Introductory Offer** for **United Kingdom** → "Free" → 1 week → eligibility "New Subscribers". You don't need to change app code; the trial is enforced by Apple. Update the paywall copy if you do.

### Optional: App Store Server Notifications V2
- [ ] App Information → App Store Server Notifications V2 URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/apple-notifications` (you would deploy a separate function for this — not implemented in this round; the receipt re-validation on app open covers most cases).

---

## 4. Privacy setup [Manual]

App Store Connect → Brewed → **App Privacy**.

For each data type below tick **Collected → Yes**, **Linked to user → Yes**, **Used for tracking → No**:

- [ ] Email address — purpose: App Functionality, Authentication
- [ ] Name (business name) — purpose: App Functionality
- [ ] User Content (events, financials, fleet, documents) — purpose: App Functionality
- [ ] Purchase History (subscription status) — purpose: App Functionality
- [ ] User ID — purpose: App Functionality

For everything else, tick **Not Collected** (location, contacts, browsing history, identifiers for tracking, advertising data, etc.).

- [ ] Privacy Policy URL: <https://brewedbyboon.com/privacy>
- [ ] Privacy Choices URL: same as above

---

## 5. Backend setup [Manual]

In your Supabase project (or new "Brewed Production" project):

- [ ] Run all SQL migrations in order: `migrations.sql`, `migration_004.sql`, `migration_005.sql`, `migration_006.sql`, `migration_007.sql`, `migration_008.sql`, `migration_009_subscriptions.sql`, `migration_010_weekly_brave_sync.sql`.
- [ ] Enable extensions in Database → Extensions: `pg_cron`, `pg_net`, `uuid-ossp` (if not already on by default).
- [ ] In `migration_004` and `migration_010`, replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` with real values before running.
- [ ] Deploy edge functions:
  ```bash
  supabase functions deploy discover-events
  supabase functions deploy sync-directory
  supabase functions deploy check-application-urls
  supabase functions deploy parse-pdf
  supabase functions deploy send-push-notification
  supabase functions deploy validate-apple-receipt --no-verify-jwt
  ```
- [ ] Set secrets:
  ```bash
  supabase secrets set BRAVE_SEARCH_API_KEY='your-brave-key'
  supabase secrets set APPLE_SHARED_SECRET='your-apple-shared-secret'
  supabase secrets set ALLOWED_PRODUCT_IDS='com.brewedbyboon.app.pro.monthly'
  ```
- [ ] Verify weekly cron is scheduled:
  ```sql
  SELECT jobname, schedule, active FROM cron.job;
  ```
  You should see `sync-directory-weekly` (Sun 03:00) and `check-application-urls-weekly` (Sun 04:00).
- [ ] Storage buckets created (see comments in `migration_007.sql` and `migration_008.sql`):
  - `event-documents` (private)
  - `sales-reports` (private)

---

## 6. App Review demo account [Manual]

Apple requires a working account to test the paywall.

- [ ] In the app: sign up with `apple-reviewer@brewedbyboon.com` / a strong password. Complete onboarding (business name, type).
- [ ] In Supabase SQL Editor:
  ```sql
  UPDATE public.profiles
  SET reviewer_grandfathered = true
  WHERE id = (SELECT id FROM auth.users WHERE email = 'apple-reviewer@brewedbyboon.com');
  ```
  This bypasses the paywall for that account only.
- [ ] In App Store Connect → App Review Information:
  - Sign-in required: Yes
  - Username: `apple-reviewer@brewedbyboon.com`
  - Password: (the one you set)
  - Notes: "Reviewer account is grandfathered to bypass IAP. To test purchase flow yourself, create a new account and use a sandbox tester from Users and Access → Sandbox."

---

## 7. Build and upload

On your Mac, in the project folder:

```bash
git pull
npm install
npx expo prebuild   # only if expo-iap is freshly installed
eas build --platform ios --profile production --auto-submit
```

`--auto-submit` uploads to App Store Connect via your `eas.json` submit config. Without it, run:

```bash
eas submit --platform ios --latest
```

After upload (~10–20 min for build, ~30–60 min for App Store processing):

- [ ] App Store Connect → TestFlight → wait for the build to finish processing.
- [ ] Add yourself as an **Internal Tester** under TestFlight → invite via email.
- [ ] Install on your physical iPhone, sign in, complete onboarding.

---

## 8. Sandbox subscription testing [Manual]

You can't be charged real money during testing — Apple uses Sandbox.

- [ ] App Store Connect → Users and Access → Sandbox → **Testers** → "+" → create a tester (use a unique email, e.g. `sandbox+brewed@yourdomain.com`).
- [ ] On your iPhone: Settings → App Store → Sandbox Account → sign in with that tester.
- [ ] Open Brewed via TestFlight → sign up with a new email → onboarding → paywall.
- [ ] Tap **Subscribe** → confirm sandbox purchase.
- [ ] Expect: `subscription_status` flips to `active` in Supabase within 5–10 seconds. Paywall closes. Dashboard appears.
- [ ] Test **Restore purchases** by signing out and back in.
- [ ] Test **Manage** button — should open `apps.apple.com/account/subscriptions`.

Sandbox subscriptions renew on accelerated timers (1 month = 5 minutes). Watch the renewal happen in Supabase.

---

## 9. Pre-submission smoke test (real device)

- [ ] Sign up with a fresh email
- [ ] Onboarding flows (business name, type)
- [ ] Paywall appears
- [ ] Subscribe with sandbox tester → entitlement granted within 10 seconds
- [ ] Add an event with financials → numbers calculate correctly
- [ ] Add a unit (fleet) → MOT alert appears if date is in the past
- [ ] Open Discover → list loads (or shows empty state cleanly if Brave key not set)
- [ ] Tap manual "refresh directory" — runs the sync function
- [ ] Reports → CSV export → file shares via the iOS share sheet
- [ ] Sign out → sign back in → data is still there
- [ ] Toggle airplane mode mid-screen → "No connection" banner appears, cached data still visible
- [ ] Force-quit and re-open → still signed in (Remember Me default)
- [ ] Enable Face ID after first sign-in → sign out → sign in via Face ID button
- [ ] Settings → Privacy summary → opens the privacy modal
- [ ] Settings → Manage → opens App Store subscriptions page
- [ ] Settings → Restore — confirms entitlement (or shows "no subscription found" for grandfathered reviewer)

---

## 10. Submit for review

- [ ] App Store Connect → Brewed → 1.0 Prepare for Submission → fill all metadata
- [ ] Build → select the TestFlight build you tested
- [ ] Submit for Review
- [ ] Expected response: 1–3 business days

**Common rejection reasons specific to this app:**
1. **Subscription metadata missing** — Apple wants the *exact* price, period, restore button, and EULA link visible on the paywall. ✅ Already in `app/(modal)/paywall.tsx`.
2. **No restore purchases button** — ✅ on paywall and Settings.
3. **Misleading subscription terms** — ✅ paywall states "Auto-renews monthly. Cancel anytime in Settings."
4. **Privacy policy URL broken** — make sure the URL works *before* you submit.
5. **Demo account doesn't work** — see §6, double-check `reviewer_grandfathered=true`.

---

## 11. Post-launch

- [ ] Monitor Apple App Store Connect → Sales for first subscriptions
- [ ] Monitor Supabase → Logs for any 5xx errors from `validate-apple-receipt`
- [ ] If you see `apple_notifications` rows accumulating without `processed=true`, you'll want to deploy the App Store Server Notifications V2 handler (future improvement #4).

---

## Suggested App Store description

```
Brewed is the trader's ledger — built for coffee vans, food trucks, festival caterers and street-food traders who run their own books.

Open the books. Get back to the pitch.

• Track every event from "applied" to "accepted" — never lose a date again.
• Per-event P&L with VAT-aware calculations, COGS, pitch fees, travel, staffing and equipment.
• Concessions companies in one place: history, contacts, applications, win rate.
• Fleet — MOT, road tax, service dates, alerts before they expire.
• Reports — annual P&L, top events, monthly breakdowns, CSV export.
• Discover — a weekly directory of UK festivals, food markets and concessions companies, refreshed automatically.
• Calendar — see your entire trading season at a glance, with overlap detection.
• Sales reconciliation — upload your POS CSV/PDF and Brewed splits revenue against your menu.
• Multi-device — sign in on your phone and your van's iPad.

Designed for the road
• Face ID / Touch ID sign in — straight back to the books.
• Works offline on poor festival signal — cached data, syncs when reconnected.
• A "Private ledger" mode that hides every £ figure behind redaction blocks for when someone's looking over your shoulder.

Privacy first
• No advertising, no tracking, no third-party analytics.
• Your sales and margins are never sold or shared.
• Apple handles your subscription payment — we never see your card.

Subscription
• Brewed Pro is £9 per month, auto-renewable, cancel anytime in Apple Settings.
• Your subscription auto-renews unless turned off at least 24 hours before the period ends.
• Privacy Policy: https://brewedbyboon.com/privacy
• Terms of Use (Apple Standard EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Run a tighter round.
```

---

## Common gotchas

- **`expo-iap` build failure**: requires `npx expo prebuild` after install. If you previously had no native modules, this is your first prebuild.
- **Sandbox tester signed into real Apple ID accidentally**: Settings → App Store → Sandbox Account → sign in there, NOT in Settings → Apple ID.
- **Receipt validation 21002 error**: receipt malformed — usually means you sent base64 with wrong padding. The current implementation passes through as-is from `expo-iap`, which is correct.
- **Receipt 21008 (production receipt verified against sandbox)**: the function already retries; don't worry about it.
- **Cron job not firing**: check `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;` — if `status = 'failed'`, the URL or service-role key is wrong.
