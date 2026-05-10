import type { ApplicationStatus, InfrastructureCategory, UnitStatus } from '@/types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; dot: string; bgHex: string; textHex: string }> = {
  pending:    { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b', bgHex: '#fef3c7', textHex: '#92400e' },
  accepted:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e', bgHex: '#dcfce7', textHex: '#166534' },
  rejected:   { bg: 'bg-red-100',    text: 'text-red-800',    dot: '#ef4444', bgHex: '#fee2e2', textHex: '#991b1b' },
  waitlisted: { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: '#3b82f6', bgHex: '#dbeafe', textHex: '#1e40af' },
  withdrawn:  { bg: 'bg-stone-100',  text: 'text-stone-700',  dot: '#a8a29e', bgHex: '#f5f5f4', textHex: '#1c1917' },
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

export const UNIT_STATUS_COLORS: Record<UnitStatus, { bg: string; text: string; dot: string; bgHex: string; textHex: string }> = {
  active:      { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#22c55e', bgHex: '#dcfce7', textHex: '#166534' },
  maintenance: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: '#f59e0b', bgHex: '#fef3c7', textHex: '#92400e' },
  retired:     { bg: 'bg-stone-100',  text: 'text-stone-600',  dot: '#a8a29e', bgHex: '#f5f5f4', textHex: '#57534e' },
};

export const BUSINESS_TYPES = [
  'Coffee', 'Street Food', 'Pizza', 'Burgers', 'Desserts',
  'Bakery', 'Crepes', 'Ice Cream', 'Juice & Smoothies',
  'Asian Food', 'Mexican Food', 'BBQ', 'Fish & Chips',
  'Vegan', 'Alcohol', 'Other',
];

export const BRAND = {
  primary:   '#6b3a2a',
  secondary: '#c9813a',
  dark:      '#1c1917',
  light:     '#fdf8f0',
};

// User-facing support + privacy URLs (App Store requirement)
// Update these to your real hosted URLs before public submission.
export const SUPPORT_EMAIL = 'support@brewedbyboon.com';
export const PRIVACY_POLICY_URL = 'https://brewedbyboon.com/privacy';
export const TERMS_URL = 'https://brewedbyboon.com/terms';
