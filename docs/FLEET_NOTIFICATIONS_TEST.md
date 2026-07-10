# Fleet Reminders — On-Device Test Checklist (EAS / TestFlight builds only)

Fleet reminders use `expo-notifications`, a native module that is a
**no-op in Expo Go**. Every check below must run on a real iPhone with a
TestFlight or EAS development build.

Tip for fast testing: set a unit's MOT date to **tomorrow** — that
schedules a "MOT due today" notification for tomorrow 09:00 and a
"due in 7/14/30 days" set only if those offsets are still in the future.
To get a notification within minutes you can temporarily set the MOT
date to today +7 days and enable only the "7 days" chip — the fire time
is always 09:00 local, so pick dates relative to that.

## 1. Permission flow
- [ ] Fresh install → Fleet → toggle Reminders ON → iOS permission dialog appears (only then — never on app launch).
- [ ] Tap **Don't Allow** → app shows the "Notifications are off" alert with an **Open Settings** button; toggle stays ON but the footer shows 0 scheduled.
- [ ] Open iOS Settings via the button, enable notifications, return, toggle OFF/ON → footer shows "N reminders scheduled · next: …".

## 2. Delivery
- [ ] Unit with MOT date = tomorrow, only "Due day" chip on → notification arrives tomorrow at 09:00 local.
- [ ] Notification title/body shows unit name, registration and due date — **no financial figures anywhere**.
- [ ] Notification arrives with the app fully closed (swiped away), not just backgrounded.

## 3. Changing dates (reschedule)
- [ ] Edit the unit's MOT date to a different day → return to Fleet screen → footer's "next:" line reflects the NEW date.
- [ ] Old-date notification does NOT fire (idempotent reschedule cancels it).

## 4. Cancelling
- [ ] Toggle Reminders OFF → footer disappears; no notifications fire afterwards.
- [ ] Turn a single offset chip off (e.g. "30 days") → only that offset stops.

## 5. Multiple units
- [ ] Two units with different MOT dates → both appear in the schedule (check "N reminders scheduled" count = sum of both units' future offsets).
- [ ] Retire one unit (status → retired) → its reminders drop from the count after revisiting Fleet.
- [ ] Delete a unit → return to Fleet screen → count drops accordingly.

## 6. App restart persistence
- [ ] Enable reminders, force-quit the app, DON'T reopen → scheduled notifications still fire (iOS delivers scheduled local notifications without the app running).
- [ ] Reopen the app → Fleet screen → count unchanged (reschedule is idempotent, no duplicates — count must not double).

## 7. Sign out / sign in
- [ ] Sign out → sign in as a DIFFERENT account → Fleet → Reminders toggle is OFF (previous user's schedule was cancelled; opt-in resets).
- [ ] Sign back in as the original account → toggle is OFF (opt-in is deliberate after any sign-out); enable → schedule rebuilds from that account's units.

## 8. Re-install
- [ ] Delete the app entirely → reinstall from TestFlight → reminders are OFF (AsyncStorage wiped with the app); enabling rebuilds cleanly.

## 9. Plan gating
- [ ] With a Trader-tier account (or dev override `setDevTierOverride('trader')` in a dev build): Fleet shows the compact "Included with Brewed Pro" upsell instead of the toggle.
- [ ] Pro account: full controls.

## Known behaviours (by design)
- Fire time is 09:00 local — never overnight.
- Already-overdue dates schedule nothing (overdue is shown in the Fleet UI status colours instead; no retroactive spam).
- iOS caps pending local notifications at 64 per app; Brewed schedules at most 48, soonest first.
- Reminders are per-device: enabling on iPhone does not enable on iPad.
