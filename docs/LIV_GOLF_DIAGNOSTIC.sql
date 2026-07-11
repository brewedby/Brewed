-- LIV Golf event — date diagnostic & optional repair
-- ===================================================
-- Context: the event screen force-closed because an event's end_date can
-- be stored with no relationship to its start date. A typo'd end-date
-- year makes the day-per-row sections expand thousands of rows.
-- The app is now hardened (bounded expansion + form validation), so the
-- event opens safely EITHER WAY — this script is for inspecting and,
-- only if you confirm a typo, correcting the stored dates.
--
-- Run in the Supabase SQL editor. Nothing here deletes the event or
-- touches financials, sales history or COGS.

-- 1) Inspect the LIV Golf row: is end_date sane?
select
  id,
  name,
  date            as start_date,
  end_date,
  (end_date::date - date::date) + 1                       as span_days,
  case
    when end_date is null                     then 'single-day (fine)'
    when end_date::date <  date::date         then 'REVERSED — end before start'
    when (end_date::date - date::date) > 30   then 'SUSPECT — span over 31 days (likely year typo)'
    else 'ok'
  end as verdict
from events
where name ilike '%liv golf%';

-- 2) Sweep every event for the same class of problem.
select id, name, date, end_date, (end_date::date - date::date) + 1 as span_days
from events
where end_date is not null
  and (end_date::date < date::date or (end_date::date - date::date) > 30)
order by span_days desc;

-- 3) OPTIONAL REPAIR — only run after step 1 confirms a typo, and only
--    after editing the corrected date below. Example: if the event runs
--    17–19 July 2026 but end_date was saved as 2062-07-19:
--
-- update events
-- set end_date = '2026-07-19'
-- where name ilike '%liv golf%'
--   and end_date::date > date::date + 30;   -- guard: only fires on the bad value
--
-- (Alternatively, fix it in the app: Edit Event → End Date. The form now
--  rejects reversed or >31-day spans, so the typo cannot be re-saved.)
