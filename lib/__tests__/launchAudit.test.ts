/**
 * Regression tests for the October 2026 pre-launch audit
 * (docs/LAUNCH_AUDIT_2026-10.md). Pure-function tests plus source pins
 * for fixes that live in React Native / Deno code the runner can't load.
 *
 * Run with:  npx tsx lib/__tests__/launchAudit.test.ts   (or npm test)
 */
import * as fs from 'fs';
import * as path from 'path';
import { shouldRelock, RELOCK_AFTER_MS } from '../appLockLogic';
import { isSubscriptionEntitled, needsSilentRevalidation } from '../iap/entitlements';
import { buildReportCsv, csvText, type CsvEventRow } from '../reportCsv';
import { SUBSCRIPTION_DETAILS } from '../iap/products';

interface Result { name: string; pass: boolean; detail: string }
const results: Result[] = [];
function expect(name: string, pass: boolean, detail = '') {
  results.push({ name, pass, detail });
}

const ROOT = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const NOW = Date.parse('2026-10-03T12:00:00Z');
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

// ── App lock timing ─────────────────────────────────────────────────────
expect('relock_off_when_disabled', !shouldRelock(NOW - 10 * RELOCK_AFTER_MS, NOW, false));
expect('relock_off_without_background', !shouldRelock(null, NOW, true));
expect('relock_off_for_quick_switch', !shouldRelock(NOW - 5_000, NOW, true), 'app switcher / Face ID sheet must not lock');
expect('relock_on_after_threshold', shouldRelock(NOW - RELOCK_AFTER_MS, NOW, true));

// ── Entitlement ─────────────────────────────────────────────────────────
expect('entitled_active_future', isSubscriptionEntitled({ subscription_status: 'active', subscription_expires_at: iso(NOW + DAY) }, NOW));
expect('entitled_within_24h_grace', isSubscriptionEntitled({ subscription_status: 'active', subscription_expires_at: iso(NOW - 23 * HOUR) }, NOW));
expect('not_entitled_after_grace', !isSubscriptionEntitled({ subscription_status: 'active', subscription_expires_at: iso(NOW - 25 * HOUR) }, NOW));
expect('not_entitled_billing_retry', !isSubscriptionEntitled({ subscription_status: 'in_billing_retry', subscription_expires_at: iso(NOW + DAY) }, NOW));
expect('entitled_grandfathered', isSubscriptionEntitled({ subscription_status: 'none', subscription_expires_at: null, reviewer_grandfathered: true }, NOW));
expect('not_entitled_null_profile', !isSubscriptionEntitled(null, NOW));

// ── Silent renewal re-validation ────────────────────────────────────────
expect('revalidate_when_expiring_soon', needsSilentRevalidation({ subscription_status: 'active', subscription_expires_at: iso(NOW + 2 * HOUR) }, NOW),
  'a renewal due within a day must be synced to the server');
expect('revalidate_when_just_lapsed', needsSilentRevalidation({ subscription_status: 'active', subscription_expires_at: iso(NOW - 3 * DAY) }, NOW));
expect('no_revalidate_far_future', !needsSilentRevalidation({ subscription_status: 'active', subscription_expires_at: iso(NOW + 20 * DAY) }, NOW));
expect('no_revalidate_never_subscribed', !needsSilentRevalidation({ subscription_status: 'none', subscription_expires_at: null }, NOW));
expect('no_revalidate_revoked', !needsSilentRevalidation({ subscription_status: 'revoked', subscription_expires_at: iso(NOW) }, NOW));
expect('no_revalidate_long_lapsed', !needsSilentRevalidation({ subscription_status: 'expired', subscription_expires_at: iso(NOW - 60 * DAY) }, NOW));
expect('no_revalidate_grandfathered', !needsSilentRevalidation({ subscription_status: 'active', subscription_expires_at: iso(NOW), reviewer_grandfathered: true }, NOW));

// ── CSV export ──────────────────────────────────────────────────────────
const row = (i: number, extra: Partial<CsvEventRow> = {}): CsvEventRow => ({
  name: `Event ${i}`, date: `2026-0${(i % 9) + 1}-01`, end_date: null, location: 'Field', status: 'accepted',
  companyName: null, financials: { gross_sales: 100 * i }, calculations: { netProfit: 10 * i, profitMargin: 10, totalStaffingCost: 0 },
  ...extra,
});
const many = Array.from({ length: 25 }, (_, i) => row(i + 1));
const csv = buildReportCsv(many);
expect('csv_exports_every_event', csv.trim().split('\n').length === 26, `${csv.trim().split('\n').length - 1} data rows`);
expect('csv_formula_injection_guarded', csvText('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"`, csvText('=HYPERLINK("x")'));
expect('csv_plain_text_untouched', csvText('Glastonbury') === '"Glastonbury"');
expect('csv_negative_profit_kept_numeric', buildReportCsv([row(1, { calculations: { netProfit: -42.5, profitMargin: -5, totalStaffingCost: 0 } })]).includes(',-42.50,'));
expect('csv_event_without_financials', buildReportCsv([row(1, { financials: null, calculations: null })]).includes(',0.00,0.00'));
expect('reports_query_exports_all_events', /csvRows[\s\S]*allEvents\.map/.test(read('lib/queries/reports.ts')) && /buildReportCsv\(data\.csvRows\)/.test(read('app/(modal)/reports.tsx')),
  'CSV export must use every event, not the top-10 list');

// ── Auth ────────────────────────────────────────────────────────────────
const authSrc = read('lib/auth.tsx');
expect('signout_is_local_scope', /signOut\(\{ scope: opts\.scope \?\? 'local' \}\)/.test(authSrc),
  'supabase-js defaults to GLOBAL — signing out one device must not sign out the others');
expect('coldstart_signout_local', /rememberMe === 'false'[\s\S]{0,600}signOut\(\{ scope: 'local' \}\)/.test(authSrc));
expect('no_bare_global_signout', !/supabase\.auth\.signOut\(\)/.test(authSrc));
expect('password_reset_signs_out_everywhere', /signOut\(\{ scope: 'global' \}\)/.test(read('app/(auth)/reset-password.tsx')));
const layoutSrc = read('app/_layout.tsx');
const layoutCode = layoutSrc.replace(/^\s*\/\/.*$/gm, '');
expect('no_deeplink_setsession', !/setSession\(/.test(layoutCode) && !/Linking\.addEventListener/.test(layoutCode),
  'URL-supplied tokens must never become the session (login CSRF)');
expect('app_lock_mounted', /<AppLockGate \/>/.test(layoutSrc));
const bioSrc = read('lib/biometrics.ts');
expect('no_refresh_token_storage', !/refreshSession|setItemAsync\(REFRESH_TOKEN_KEY/.test(bioSrc),
  'the replay-a-stored-refresh-token design can never work with token rotation');
expect('signin_no_dead_faceid_button', !/signInWithBiometric/.test(read('app/(auth)/sign-in.tsx')));
expect('supabase_foreground_autorefresh', /startAutoRefresh\(\)/.test(read('lib/supabase.ts')));

// ── Subscriptions ───────────────────────────────────────────────────────
const subSrc = read('lib/iap/SubscriptionContext.tsx');
expect('purchase_listener_not_gated_on_user', !/if \(!iap \|\| !user\) return;\s*const updateSub/.test(subSrc) && /pendingPurchases/.test(subSrc),
  'renewals replayed at launch arrive before the session loads');
expect('silent_revalidation_wired', /needsSilentRevalidation\(/.test(subSrc) && /AppState\.addEventListener/.test(subSrc));
expect('function_error_body_surfaced', /\.context/.test(subSrc) && /body\.error/.test(subSrc));
expect('no_unlisted_expo_modules_core', !/expo-modules-core/.test(subSrc));
const allFeatures = Object.values(SUBSCRIPTION_DETAILS).flatMap((d) => d.features).join('\n');
expect('paywall_no_phantom_trends_feature', !/performance trends/i.test(allFeatures), 'feature does not exist');
expect('paywall_faceid_is_app_lock', /app lock/i.test(allFeatures) && !/Face ID \/ Touch ID sign in/.test(allFeatures));

// ── Account deletion ────────────────────────────────────────────────────
const settingsSrc = read('app/(tabs)/settings.tsx');
expect('deletion_removes_storage_first', /deleteUserStorage\([\s\S]{0,200}rpc\('delete_own_account'\)/.test(settingsSrc),
  'Storage objects do not cascade from auth.users');
expect('deletion_warns_subscription_continues', /does NOT cancel your App Store subscription/.test(settingsSrc));

// ── Data integrity ──────────────────────────────────────────────────────
const evMut = read('lib/mutations/events.ts');
expect('event_update_checks_delete_errors', ['unitDelError', 'staffDelError', 'infraDelError'].every((v) => evMut.includes(`if (${v}) throw ${v}`)),
  'a failed delete followed by insert duplicates staffing rows');
expect('observations_use_local_date', !/toISOString\(\)\.slice\(0, 10\)/.test(read('lib/queries/eventObservations.ts')));

// ── Backend ─────────────────────────────────────────────────────────────
const urlFn = read('supabase/functions/check-application-urls/index.ts');
expect('url_check_service_role_only', /claims\?\.role === 'service_role'/.test(urlFn) && /if \(!isServiceRoleCaller\(req\)\)/.test(urlFn) && /status: 403/.test(urlFn),
  'role claim, not a raw key comparison (the runtime key differs from the Vault JWT)');
expect('url_check_no_push_relay', !/send-push-notification/.test(urlFn));
const syncFn = read('supabase/functions/sync-directory/index.ts');
expect('sync_finishes_within_time_limit', /TIME_BUDGET_MS/.test(syncFn) && /URL_CHECK_CONCURRENCY/.test(syncFn),
  'the sequential page check ran past the 150s edge-function limit and was killed');
expect('sync_no_hardcoded_years', !/\b2025\b/.test(syncFn), 'queries must compute the season');
expect('sync_has_cooldown', /MIN_HOURS_BETWEEN_SYNCS/.test(syncFn));
expect('receipt_fn_fails_closed', /existingErr/.test(read('supabase/functions/validate-apple-receipt/index.ts')));
const m19 = read('supabase/migration_019_launch_hardening.sql');
expect('migration_guard_covers_insert', /BEFORE INSERT OR UPDATE ON public\.profiles/.test(m19));
expect('migration_adds_receipt_columns', ['subscription_environment', 'apple_original_transaction_id', 'apple_latest_transaction_id', 'subscription_validated_at'].every((c) => m19.includes(`ADD COLUMN IF NOT EXISTS ${c}`)));
expect('migration_cron_uses_vault', /vault\.decrypted_secrets/.test(m19) && !/'Bearer YOUR_/.test(m19));
expect('migration_is_transactional', /^BEGIN;/m.test(m19) && /^COMMIT;/m.test(m19));

// ── Report ──────────────────────────────────────────────────────────────
let fail = 0;
for (const r of results) {
  if (!r.pass) fail++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(44)} ${r.detail}`);
}
console.log(`\n${results.length - fail} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
