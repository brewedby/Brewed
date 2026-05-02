# Brewed — Future Improvements

Prioritised roadmap for after App Store launch. Each item includes a rough effort estimate and the files most likely to change.

---

## Tier 0 — Must-do before launch

These are listed in `docs/APP_STORE_LAUNCH.md`. They aren't here because they're not "improvements" — they're required for the first submission to pass review.

---

## Tier 1 — Soon after launch (week 1–4)

### 1.1 App Store Server Notifications V2 handler  *(half day)*
Apple sends a JSON push to a webhook URL whenever a subscription changes — renewed, cancelled, refunded, expired, billing failure, grace period entered, etc. We currently re-validate on app open + every 5 minutes when the app is active. With S2S notifications, cancellations and refunds reflect within seconds and we can mark `subscription_status='revoked'` on a refund without waiting for the user to come back.

- Deploy a new Edge Function `apple-notifications` that verifies the JWT signature on the payload (Apple signs with their leaf cert), looks up the user by `original_transaction_id`, and updates `profiles.subscription_status` accordingly.
- Set the URL in App Store Connect → App Information → App Store Server Notifications V2 URL.
- Use the existing `apple_notifications` table (already created in migration_009) as a write-ahead log for replay.

### 1.2 7-day free trial  *(no code; App Store Connect only)*
Configured in App Store Connect → Subscriptions → Brewed Pro Monthly → Introductory Offers → Free → 1 week → New Subscribers. Apple enforces eligibility. Tweak paywall copy to mention the trial.

### 1.3 In-app account deletion  *(half day)*
Apple now requires this. Add a "Delete account" button in Settings (under Sign out) → confirmation sheet → call a new Edge Function `delete-account` that uses the service-role key to delete the user from `auth.users` (cascades to all rows). Show a goodbye screen + sign out.

- Files: `app/(tabs)/settings.tsx`, new `supabase/functions/delete-account/index.ts`.

### 1.4 Empty paywall fallback for store-unavailable  *(1 hour)*
If `iap.initConnection()` fails (e.g. user has no Apple ID signed in) the paywall currently shows the fallback price and disables the Subscribe button. Add a friendlier "Sign into the App Store to subscribe" message + a button that opens iOS Settings.

- File: `app/(modal)/paywall.tsx`.

### 1.5 Web hosting for privacy policy & support page  *(1 day)*
Host `docs/PRIVACY_POLICY.md` (rendered to HTML) at <https://brewedbyboon.com/privacy>. Use a static site (Vercel, Netlify, GitHub Pages). Same site can host a `/support` page with FAQ + contact form.

### 1.6 In-app push notification permission flow  *(2 hours)*
The `expo-notifications` plugin is installed and `profiles.push_token` exists, but the app never requests permission or saves the token. Add to `app/_layout.tsx` an effect that, after first sign-in, requests permission and saves the token. Then build the `send-push-notification` Edge Function caller (already exists) so MOT/tax/event reminders fire.

---

## Tier 2 — Nice to have (month 1–3)

### 2.1 "Vault Mode" — opt-in end-to-end encryption for financials  *(1–2 weeks)*
Marketed as a paid Pro+ feature or included in Pro for users who really need it. Implementation outline in `docs/AUDIT_REPORT.md` §6 Option B. Sell as: "We store your figures, but we cannot read them — even if we wanted to."

- Adds significant onboarding friction (passphrase setup) so should be opt-in.
- Forgotten passphrase = data loss; need clear warnings and exporting before enabling.

### 2.2 Year-over-year column in Reports  *(3 hours)*
Already noted in the previous design plan — fetch previous year alongside current and show `+/- vs last year` on each monthly row.

- Files: `lib/queries/reports.ts`, `app/(tabs)/reports.tsx`.

### 2.3 Profit margin badge on EventCard  *(1 hour)*
Inline net profit + margin % on each event in the list, since `calculations.netProfit` and `calculations.profitMargin` already exist.

- File: `components/events/EventCard.tsx`.

### 2.4 Post-event completion prompt  *(2 hours)*
On open of an accepted past event with `gross_sales=0`, banner "Add your sales figures."

- File: `app/(tabs)/events/[id]/index.tsx`.

### 2.5 Event search  *(1 hour)*
Text search input on events list, client-side filter by name/location.

- File: `app/(tabs)/events/index.tsx`.

### 2.6 Duplicate event  *(2 hours)*
Button on event detail → opens new-event form pre-filled. Essential for re-applying year-on-year.

- Files: `app/(tabs)/events/[id]/index.tsx`, `app/(tabs)/events/new.tsx`.

### 2.7 Drill-down from monthly Reports row  *(2 hours)*
Tap month → events list filtered to that year+month.

### 2.8 Dashboard insights strip  *(3 hours)*
Contextual callout cards under the stats: "3 applications pending 30+ days", "Best month: June (£4,200 net)", "Acceptance rate down 14% vs last year." Pure analysis of `useDashboard` data.

### 2.9 Swipe-to-status on EventCard  *(3 hours)*
Swipe left to reveal Accepted / Rejected / Withdrawn quick actions.

### 2.10 Document upload (insurance, permits)  *(half day)*
Already partially scaffolded in `event_documents` table. Wire the picker, upload to Supabase Storage, render attachment list on event detail.

### 2.11 Mileage log per event  *(half day)*
`miles_driven` already exists on `event_financials` (migration 007). Surface it in EventForm with auto-calc at HMRC 45p/mile. Aggregate in annual reports.

### 2.12 Quick sales entry on Dashboard  *(half day)*
`QuickSalesSheet` component already exists in `components/dashboard/`. Wire a "Log today's sales" button on Dashboard → bottom sheet → pick event → enter figure → save.

---

## Tier 3 — Bigger roadmap (post month 3)

### 3.1 Android / Google Play Billing  *(1 week)*
Add Google Play Billing flow alongside Apple. `expo-iap` supports both. Adds `subscription_environment` value 'GooglePlay'. New Edge Function `validate-google-receipt` for Play receipt verification.

### 3.2 Breakeven calculator on event detail  *(2 hours)*
"You need £X gross sales to break even." Computed from pitch fee + travel + staffing already entered.

### 3.3 Better CSV export  *(1 hour)*
Audit current export — likely missing company name, unit, margin %, individual cost lines. Fix in `app/(tabs)/reports.tsx`.

### 3.4 Fleet maintenance log  *(1–2 days)*
List of service entries per unit. New `maintenance_entries` table.

### 3.5 Real-time sync via Supabase channels  *(1 day)*
`supabase.channel('...')` subscriptions for events/financials so two devices see each other's changes within a second instead of next refetch.

### 3.6 Apple Wallet pass for upcoming events  *(2–3 days)*
Generate a `.pkpass` file per accepted event with date, location, pitch number — saves to Wallet for one-tap reference at the gate.

### 3.7 Receipt OCR for COGS  *(2–3 days)*
Take a photo of a supplier receipt → on-device VisionKit OCR → suggest cost lines. Stays on-device for privacy (no upload to cloud OCR).

### 3.8 HMRC Making Tax Digital integration  *(big — week+)*
Optional add-on for VAT-registered traders to submit quarterly VAT returns from Brewed. Requires HMRC OAuth + accreditation. Material competitive moat if we land it.

### 3.9 Multi-user / staff accounts  *(1 week)*
Owner invites staff with limited permissions (can log sales but can't see margins, can mark events accepted but can't delete). Requires roles in `profiles` and per-table RLS rewrite.

### 3.10 Public profile / "Brewed Card" for traders  *(1 week)*
Optional public page (opt-in) showing trader info, served events, contact — useful for being discovered by event organisers. Lives at `brewedbyboon.com/u/<slug>`.

---

## Privacy & security improvements

### P.1 Operational logging  *(half day)*
Log every administrative DB query made via the service-role key (separate from app-side queries) so any developer access to user data leaves an audit trail. Could route through a small Supabase Edge Function that wraps queries.

### P.2 Hardware-key 2FA on developer Supabase Dashboard  *(once-off)*
Operational, not code: enable WebAuthn / hardware key for the Supabase team. Removes the single-point-of-failure of "developer email gets phished → all user data accessible."

### P.3 Database backup encryption with separate key  *(1 day)*
Beyond Supabase's at-rest encryption, encrypt nightly export dumps with a key held offline (e.g. on a YubiKey).

### P.4 Annual security review  *(operational)*
Schedule a yearly external security audit once user count justifies the cost (~£3–5k for a small SaaS app).

---

## Subscription & retention improvements

### S.1 Annual subscription option  *(half day)*
Add a yearly product (`com.brewedbyboon.app.pro.yearly`) at £79/year (≈30% discount vs monthly). Configure in App Store Connect, add to `lib/iap/products.ts` PRODUCT_IDS, render both options on paywall.

### S.2 Win-back offer  *(1 day)*
Apple lets you target lapsed subscribers with a discounted re-subscribe offer. Configure in App Store Connect → Subscription Pricing → Win-Back Offer.

### S.3 Promotional codes  *(operational)*
Generate App Store promo codes for press / friendly users. Free, just done in App Store Connect.

### S.4 Subscription pause  *(operational)*
Apple supports user-initiated pause for monthly subscriptions in App Store Connect settings — turn it on so traders can pause out-of-season.

### S.5 Onboarding-first paywall A/B test  *(1 week)*
Test paywall before vs after onboarding to see which converts better. Track via App Store Connect → App Analytics (no third-party analytics needed).

---

## Reliability improvements

### R.1 Sentry-equivalent without Sentry  *(half day)*
For privacy reasons we don't ship Sentry/Bugsnag. Build a minimal in-house crash log: Edge Function `report-error` that accepts `{message, stack, screen}` (with financial fields scrubbed by allowlist) and writes to a `client_errors` table. Surface in your own admin view.

### R.2 Offline mutation queue  *(2–3 days)*
React Query offline support. Currently we cache reads but mutations fail silently when offline. Add `online`-aware mutations that queue and retry when reconnected. Critical for festival-pitch workflow.

### R.3 Automated backups on user device  *(half day)*
Weekly export → emailed to user as a CSV+JSON pack. Local guarantee against data loss.

### R.4 Unit + E2E tests  *(2 weeks rolling)*
Currently zero tests. Bring up Jest for `lib/calculations.ts` first (highest correctness value) then Detox for end-to-end on the critical flows (sign in, create event with financials, dashboard renders correctly).

---

## Customer support improvements

### C.1 In-app feedback form  *(half day)*
Settings → "Send feedback" → simple form → emails support@brewedbyboon.com. No third-party (privacy).

### C.2 Help screens  *(1 day)*
Cluster of `app/(modal)/help/*` screens with tutorial content for the trickier features (VAT settings, COGS reconciliation, application pipeline).

### C.3 In-app changelog  *(2 hours)*
Settings → "What's new" → renders a markdown changelog bundled with each release. Builds product-velocity perception.

### C.4 Public roadmap  *(operational)*
Public Notion / GitHub Issues board so users can vote on features. Drives loyalty.

---

## Brewed-specific product enhancements

### B.1 Invoicing & receipts  *(1–2 weeks)*
Generate PDF invoices for B2B catering jobs. Integrates with `event_financials`.

### B.2 Supplier price tracking  *(1 week)*
Track when supplier costs change, alert when margins compress. New `supplier_prices` table.

### B.3 Festival weather contingency planning  *(1 week)*
Already showing 7-day forecast on event detail. Add "rain alert" 48h before event with revised takings forecast.

### B.4 Application pack generator  *(1 week)*
For each event, auto-generate the standard application pack (insurance, food hygiene cert, risk assessment, sample menu) into one PDF/zip ready to email.

### B.5 Stock sheet per event  *(1 week)*
Pre-event: enter stock taken. Post-event: enter stock returned. Auto-calc usage, suggest COGS. Far more accurate than gross-cost guess.
