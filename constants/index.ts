import type { ApplicationStatus, InfrastructureCategory, UnitStatus } from '@/types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; dot: string }> = {
  pending:    { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b' },
  accepted:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e' },
  rejected:   { bg: 'bg-red-100',    text: 'text-red-800',    dot: '#ef4444' },
  waitlisted: { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: '#3b82f6' },
  withdrawn:  { bg: 'bg-stone-100',  text: 'text-stone-600',  dot: '#a8a29e' },
};

export const STATUS_PIE_COLORS: Record<ApplicationStatus, string> = {
  accepted:   '#22c55e',
  pending:    '#f59e0b',
  rejected:   '#ef4444',
  waitlisted: '#3b82f6',
  withdrawn:  '#a8a29e',
};

export const INFRASTRUCTURE_CATEGORY_LABELS: Record<InfrastructureCategory, string> = {
  pitch_fee: 'Pitch Fee',
  travel:    'Travel',
  equipment: 'Equipment',
  supplies:  'Supplies',
  other:     'Other',
};

export const STATUSES: ApplicationStatus[] = [
  'pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn',
];

export const INFRASTRUCTURE_CATEGORIES: InfrastructureCategory[] = [
  'pitch_fee', 'travel', 'equipment', 'supplies', 'other',
];

export const UNIT_STATUSES: UnitStatus[] = ['active', 'maintenance', 'retired'];

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  active:      'Active',
  maintenance: 'In Maintenance',
  retired:     'Retired',
};

export const UNIT_STATUS_COLORS: Record<UnitStatus, { bg: string; text: string; dot: string }> = {
  active:      { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e' },
  maintenance: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b' },
  retired:     { bg: 'bg-stone-100',  text: 'text-stone-600',  dot: '#a8a29e' },
};

export const BRAND = {
  primary:   '#6b3a2a',
  secondary: '#c9813a',
  dark:      '#1c1917',
  light:     '#fdf8f0',
};
