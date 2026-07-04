/**
 * Fleet reminder schedule builder — PURE logic, no React Native imports,
 * fully testable with tsx.
 *
 * Given the user's units and reminder preferences, produce the exact list
 * of local notifications to schedule: MOT / tax / service, each at
 * 30 / 14 / 7 / 0 days before the due date (offsets user-configurable).
 *
 * Anti-spam guarantees:
 *  - at most one notification per (unit, kind, offset) — keys are stable
 *  - only future fire times are returned (nothing fires retroactively
 *    for already-overdue dates; overdue is shown in the Fleet UI instead)
 *  - notifications fire at 09:00 local time, never at night
 *
 * Privacy: titles/bodies contain the unit name, registration and due
 * date ONLY — never any financial data.
 */

export type ReminderKind = 'mot' | 'tax' | 'service';

export interface ReminderPrefs {
  enabled: boolean;
  offsets: { d30: boolean; d14: boolean; d7: boolean; d0: boolean };
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  enabled: false, // opt-in — never schedule before the user asks
  offsets: { d30: true, d14: true, d7: true, d0: true },
};

export interface ReminderUnit {
  id: string;
  name: string;
  registration: string | null;
  status: string;
  mot_date: string | null;
  tax_date: string | null;
  service_date: string | null;
}

export interface FleetReminder {
  /** Stable dedupe key: unitId:kind:offsetDays */
  key: string;
  unitId: string;
  kind: ReminderKind;
  dueDate: string;
  offsetDays: number;
  fireDate: Date;
  title: string;
  body: string;
}

const KIND_LABEL: Record<ReminderKind, string> = {
  mot: 'MOT',
  tax: 'Vehicle tax',
  service: 'Service',
};

const OFFSET_DAYS: { days: number; pref: keyof ReminderPrefs['offsets'] }[] = [
  { days: 30, pref: 'd30' },
  { days: 14, pref: 'd14' },
  { days: 7,  pref: 'd7'  },
  { days: 0,  pref: 'd0'  },
];

const FIRE_HOUR_LOCAL = 9;

function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Parse YYYY-MM-DD as a LOCAL date at the notification hour, offset back
 *  by `offsetDays`. Avoids the UTC-midnight parse that shifted dates by a
 *  day in BST (the app's earlier timezone bug class). */
function fireDateFor(dueIso: string, offsetDays: number): Date | null {
  const [y, m, d] = dueIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, FIRE_HOUR_LOCAL, 0, 0, 0);
  dt.setDate(dt.getDate() - offsetDays);
  return dt;
}

function reminderTitle(kind: ReminderKind, offsetDays: number): string {
  const label = KIND_LABEL[kind];
  if (offsetDays === 0) return `${label} due today`;
  return `${label} due in ${offsetDays} days`;
}

function reminderBody(unit: ReminderUnit, kind: ReminderKind, dueIso: string): string {
  const reg = unit.registration ? ` (${unit.registration})` : '';
  return `${unit.name}${reg} — ${KIND_LABEL[kind]} due ${formatDueDate(dueIso)}.`;
}

/**
 * Build the full schedule. Deterministic: pass `now` explicitly.
 * Retired units are skipped — no reminders for vehicles off the road.
 */
export function buildReminderSchedule(
  units: ReminderUnit[],
  prefs: ReminderPrefs,
  now: Date,
): FleetReminder[] {
  if (!prefs.enabled) return [];

  const reminders: FleetReminder[] = [];
  const seen = new Set<string>();

  for (const unit of units) {
    if (unit.status === 'retired') continue;

    const dues: { kind: ReminderKind; date: string | null }[] = [
      { kind: 'mot',     date: unit.mot_date },
      { kind: 'tax',     date: unit.tax_date },
      { kind: 'service', date: unit.service_date },
    ];

    for (const { kind, date } of dues) {
      if (!date) continue;
      for (const { days, pref } of OFFSET_DAYS) {
        if (!prefs.offsets[pref]) continue;
        const fireDate = fireDateFor(date, days);
        if (!fireDate) continue;
        if (fireDate.getTime() <= now.getTime()) continue; // never fire in the past

        const key = `${unit.id}:${kind}:${days}`;
        if (seen.has(key)) continue;
        seen.add(key);

        reminders.push({
          key,
          unitId: unit.id,
          kind,
          dueDate: date,
          offsetDays: days,
          fireDate,
          title: reminderTitle(kind, days),
          body: reminderBody(unit, kind, date),
        });
      }
    }
  }

  // Soonest first — if a platform caps pending notifications (iOS: 64),
  // the nearest reminders win.
  reminders.sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime());
  return reminders;
}

/** iOS caps pending local notifications at 64 per app. Leave headroom. */
export const MAX_SCHEDULED = 48;
