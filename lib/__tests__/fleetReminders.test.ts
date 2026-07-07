/**
 * Tests for the fleet reminder scheduler.
 *
 * Halves:
 *  1. Pure unit tests of buildReminderSchedule() — offsets, anti-spam,
 *     privacy, past-date handling, retired units.
 *  2. File-content invariants pinning the runtime wiring (Expo Go guard,
 *     idempotent reschedule, Pro gating, permission flow).
 *
 * Run with:  npx tsx lib/__tests__/fleetReminders.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

interface Test { name: string; pass: boolean; detail: string }
const results: Test[] = [];
function expect(name: string, cond: boolean, detail: string = '') {
  results.push({ name, pass: cond, detail });
}

import {
  buildReminderSchedule, DEFAULT_REMINDER_PREFS, MAX_SCHEDULED,
  type ReminderPrefs, type ReminderUnit,
} from '../fleetReminders';

const NOW = new Date(2026, 6, 1, 12, 0, 0); // 1 Jul 2026, midday local

const van: ReminderUnit = {
  id: 'u1', name: 'Bertha', registration: 'AB12 CDE', status: 'active',
  mot_date: '2026-08-15', tax_date: null, service_date: null,
};

const allOn: ReminderPrefs = { enabled: true, offsets: { d30: true, d14: true, d7: true, d0: true } };

// ── 1. Basic scheduling ───────────────────────────────────────────────────────
{
  const schedule = buildReminderSchedule([van], allOn, NOW);
  expect('mot_gets_four_offsets', schedule.length === 4, `got ${schedule.length}`);
  expect('offsets_are_30_14_7_0',
    JSON.stringify(schedule.map(r => r.offsetDays).sort((a, b) => b - a)) === JSON.stringify([30, 14, 7, 0]),
    schedule.map(r => r.offsetDays).join(','));
  expect('sorted_soonest_first',
    schedule.every((r, i) => i === 0 || r.fireDate.getTime() >= schedule[i - 1].fireDate.getTime()),
    'schedule must be sorted by fire time');
  const dayOf = schedule.find(r => r.offsetDays === 0)!;
  expect('due_day_title', dayOf.title === 'MOT due today', dayOf.title);
  const d14 = schedule.find(r => r.offsetDays === 14)!;
  expect('offset_title', d14.title === 'MOT due in 14 days', d14.title);
  expect('body_has_unit_and_reg',
    dayOf.body.includes('Bertha') && dayOf.body.includes('AB12 CDE'),
    dayOf.body);
  expect('body_has_due_date', dayOf.body.includes('15 Aug 2026'), dayOf.body);
  expect('fires_at_9am_local', schedule.every(r => r.fireDate.getHours() === 9),
    schedule.map(r => r.fireDate.getHours()).join(','));
}

// ── 2. Privacy — no financial data in content ────────────────────────────────
{
  const schedule = buildReminderSchedule([van], allOn, NOW);
  const allText = schedule.map(r => `${r.title} ${r.body}`).join(' ');
  expect('no_currency_in_notifications', !/[£$€]|\d+\.\d{2}|profit|sales|revenue|cogs/i.test(allText),
    'notification content must never include financial data');
}

// ── 3. Past dates are never scheduled ────────────────────────────────────────
{
  const overdue: ReminderUnit = { ...van, id: 'u2', mot_date: '2026-06-01' }; // a month ago
  const schedule = buildReminderSchedule([overdue], allOn, NOW);
  expect('overdue_produces_no_notifications', schedule.length === 0,
    `overdue MOT must not fire retroactive notifications (got ${schedule.length})`);
}
{
  // Due in 10 days: 30/14-day offsets are already past → only 7 and 0 remain.
  const soon: ReminderUnit = { ...van, id: 'u3', mot_date: '2026-07-11' };
  const schedule = buildReminderSchedule([soon], allOn, NOW);
  expect('near_due_skips_past_offsets',
    JSON.stringify(schedule.map(r => r.offsetDays).sort((a, b) => b - a)) === JSON.stringify([7, 0]),
    schedule.map(r => r.offsetDays).join(','));
}

// ── 4. Prefs are respected ───────────────────────────────────────────────────
{
  const only7: ReminderPrefs = { enabled: true, offsets: { d30: false, d14: false, d7: true, d0: false } };
  const schedule = buildReminderSchedule([van], only7, NOW);
  expect('disabled_offsets_skipped', schedule.length === 1 && schedule[0].offsetDays === 7,
    schedule.map(r => r.offsetDays).join(','));
}
{
  const off: ReminderPrefs = { ...allOn, enabled: false };
  expect('master_toggle_off_schedules_nothing',
    buildReminderSchedule([van], off, NOW).length === 0, '');
}
{
  expect('defaults_are_opt_in', DEFAULT_REMINDER_PREFS.enabled === false,
    'reminders must be opt-in — never schedule before the user asks');
  expect('default_offsets_all_on',
    Object.values(DEFAULT_REMINDER_PREFS.offsets).every(Boolean),
    'once enabled, sensible defaults: 30/14/7/0 all on');
}

// ── 5. Retired units and multi-kind units ────────────────────────────────────
{
  const retired: ReminderUnit = { ...van, id: 'u4', status: 'retired' };
  expect('retired_units_skipped', buildReminderSchedule([retired], allOn, NOW).length === 0, '');
}
{
  const full: ReminderUnit = {
    id: 'u5', name: 'Truck', registration: null, status: 'active',
    mot_date: '2026-09-01', tax_date: '2026-09-10', service_date: '2026-10-01',
  };
  const schedule = buildReminderSchedule([full], allOn, NOW);
  expect('three_kinds_times_four_offsets', schedule.length === 12, `got ${schedule.length}`);
  const kinds = new Set(schedule.map(r => r.kind));
  expect('covers_mot_tax_service', kinds.has('mot') && kinds.has('tax') && kinds.has('service'),
    Array.from(kinds).join(','));
  expect('no_reg_no_parens', schedule.every(r => !r.body.includes('()')),
    'missing registration must not render empty parentheses');
}

// ── 6. Dedupe keys are stable and unique ─────────────────────────────────────
{
  const schedule = buildReminderSchedule([van, van], allOn, NOW); // same unit passed twice
  expect('duplicate_units_deduped', schedule.length === 4,
    `same (unit,kind,offset) must never schedule twice (got ${schedule.length})`);
  const keys = new Set(schedule.map(r => r.key));
  expect('keys_unique', keys.size === schedule.length, '');
}

// ── 7. iOS pending-notification cap ──────────────────────────────────────────
{
  expect('max_scheduled_under_ios_cap', MAX_SCHEDULED <= 64 && MAX_SCHEDULED > 0,
    `MAX_SCHEDULED=${MAX_SCHEDULED} (iOS caps pending local notifications at 64)`);
}

// ── 8. File-content invariants ────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const notifSrc  = read('lib/notifications.ts');
const cardSrc   = read('components/units/FleetRemindersCard.tsx');
const fleetSrc  = read('app/(modal)/fleet/index.tsx');
const logicSrc  = read('lib/fleetReminders.ts');

expect('runtime_has_expo_go_guard',
  notifSrc.includes("appOwnership") && notifSrc.includes('storeClient'),
  'notifications runtime must no-op in Expo Go');

expect('runtime_lazy_requires_module',
  notifSrc.includes("require('expo-notifications')"),
  'native module must be lazily required, not statically imported');

expect('reschedule_cancels_before_scheduling',
  notifSrc.indexOf('cancelScheduledNotificationAsync') < notifSrc.indexOf('scheduleNotificationAsync('),
  'reschedule must cancel the previous schedule first (idempotency)');

expect('scheduled_ids_persisted',
  notifSrc.includes('SCHEDULED_IDS_KEY') && notifSrc.includes('AsyncStorage.setItem(SCHEDULED_IDS_KEY'),
  'scheduled notification ids must persist so restarts can cancel/resync');

expect('no_silent_permission_prompt',
  notifSrc.includes('promptIfNeeded'),
  'background syncs must not surprise the user with a permission dialog');

expect('card_gated_pro',
  cardSrc.includes("useFeature('fleet_reminders')"),
  'reminders card must gate via the central useFeature hook');

expect('card_shows_upgrade_when_gated',
  cardSrc.includes('UpgradePrompt'),
  'Trader users see a calm upsell, not a broken control');

expect('card_offers_offset_choices',
  cardSrc.includes("'d30'") && cardSrc.includes("'d14'") && cardSrc.includes("'d7'") && cardSrc.includes("'d0'"),
  'user can adjust which offsets fire');

expect('card_handles_denied_permission',
  cardSrc.includes('app-settings:'),
  'denied permission path must guide the user to iOS Settings');

expect('fleet_screen_renders_card',
  fleetSrc.includes('FleetRemindersCard'),
  'fleet screen must render the reminders card');

expect('logic_module_is_pure',
  !logicSrc.includes("from 'react-native'") && !logicSrc.includes('expo-') && !logicSrc.includes('supabase'),
  'fleetReminders.ts must stay dependency-free (testable + reusable)');

// ── Report ────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const width = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width + 2)}${r.detail ? ' ' + r.detail : ''}`);
}
console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length > 0) process.exit(1);

// ── 9. Sign-out cleanup + checklist (launch audit additions) ─────────────────
{
  const results3: Test[] = [];
  const expect3 = (name: string, cond: boolean, detail: string = '') => { results3.push({ name, pass: cond, detail }); };

  const notifSrc3 = fs.readFileSync(path.join(ROOT, 'lib', 'notifications.ts'), 'utf8');
  const authSrc   = fs.readFileSync(path.join(ROOT, 'lib', 'auth.tsx'), 'utf8');

  expect3('clear_helper_exists',
    notifSrc3.includes('export async function clearFleetReminders'),
    'notifications runtime must expose clearFleetReminders');

  expect3('clear_resets_optin',
    /clearFleetReminders[\s\S]{0,900}enabled: false/.test(notifSrc3),
    'clearing must reset the opt-in flag so the next account starts disabled');

  expect3('signout_clears_reminders',
    authSrc.includes('clearFleetReminders()'),
    'signOut must cancel the previous user\'s vehicle reminders');

  expect3('signout_clear_never_blocks',
    notifSrc3.includes('never block sign-out'),
    'cleanup must be best-effort — a notification failure must not trap the user signed in');

  expect3('eas_checklist_exists',
    fs.existsSync(path.join(ROOT, 'docs', 'FLEET_NOTIFICATIONS_TEST.md')),
    'on-device EAS test checklist must exist');

  const checklist = fs.readFileSync(path.join(ROOT, 'docs', 'FLEET_NOTIFICATIONS_TEST.md'), 'utf8');
  expect3('checklist_covers_required_flows',
    ['Permission', 'Delivery', 'reschedule', 'Cancel', 'Multiple units', 'restart', 'Sign out', 'Re-install']
      .every((s) => checklist.includes(s)),
    'checklist must cover permissions, delivery, date change, cancel, multi-unit, restart, re-login, re-install');

  for (const r of results3) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(38)}${r.detail ? ' ' + r.detail : ''}`);
  }
  const failed3 = results3.filter(r => !r.pass);
  console.log(`\nsign-out cleanup: ${results3.length - failed3.length} passed, ${failed3.length} failed`);
  if (failed3.length > 0) process.exit(1);
}
