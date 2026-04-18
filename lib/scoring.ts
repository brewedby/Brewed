import type { EventWithFinancials, ApplicationStatus } from '@/types';

export interface ScoreResult {
  score: number;       // 0-100
  label: string;       // e.g. "Strong Pick"
  color: string;       // tailwind text colour class
  reasons: string[];
}

const STATUS_SCORE: Record<ApplicationStatus, number> = {
  accepted: 30, waitlisted: 18, pending: 10, rejected: 0, withdrawn: 0,
};

export function scoreEvent(
  event: EventWithFinancials,
  allEvents: EventWithFinancials[],
): ScoreResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Status (0–30)
  const statusPts = STATUS_SCORE[event.status] ?? 10;
  score += statusPts;
  if (event.status === 'accepted')   reasons.push('Already accepted ✓');
  if (event.status === 'waitlisted') reasons.push('Currently on waitlist');
  if (event.status === 'pending')    reasons.push('Application pending');

  // 2. Historical profit with same company (0–35)
  const past = allEvents.filter(
    (e) =>
      e.company_id &&
      e.company_id === event.company_id &&
      e.id !== event.id &&
      new Date(e.date) < new Date() &&
      e.calculations.netProfit > 0,
  );
  if (past.length > 0) {
    const avg = past.reduce((s, e) => s + e.calculations.netProfit, 0) / past.length;
    const pts = Math.min(35, Math.round(avg / 50));
    score += pts;
    reasons.push(`Avg \u00a3${avg.toFixed(0)} net from ${past.length} past event${past.length > 1 ? 's' : ''} with this company`);
  } else if (event.calculations.netProfit > 0) {
    const pts = Math.min(35, Math.round(event.calculations.netProfit / 50));
    score += pts;
    reasons.push(`\u00a3${event.calculations.netProfit.toFixed(0)} net profit recorded`);
  } else {
    score += 10;
    reasons.push('No historical data for this company yet');
  }

  // 3. Estimated event scale from pitch fee paid (0–25)
  const pitchFeePaid = event.event_financials?.pitch_fee ?? 0;
  const sizePts = pitchFeePaid >= 3000 ? 25 : pitchFeePaid >= 1500 ? 20 : pitchFeePaid >= 800 ? 14 : pitchFeePaid >= 300 ? 8 : 5;
  score += sizePts;
  if (sizePts >= 20) reasons.push('Large-scale event (high revenue potential)');
  else if (sizePts >= 14) reasons.push('Mid-size event');
  else reasons.push('Smaller or local event');

  // 4. Duration bonus (0–10)
  const days = event.end_date
    ? Math.round((new Date(event.end_date).getTime() - new Date(event.date).getTime()) / 86400000) + 1
    : 1;
  const durPts = Math.min(10, days * 3);
  score += durPts;
  if (days > 1) reasons.push(`${days}-day event (+${durPts} pts for duration)`);

  score = Math.min(100, Math.max(0, score));

  let label = 'Uncertain';
  let color = 'text-slate-500';
  if (score >= 75) { label = 'Strong Pick';   color = 'text-green-600'; }
  else if (score >= 55) { label = 'Good Option';  color = 'text-amber-600'; }
  else if (score >= 35) { label = 'Consider';     color = 'text-orange-500'; }
  else { label = 'Low Priority'; color = 'text-red-500'; }

  return { score, label, color, reasons };
}
