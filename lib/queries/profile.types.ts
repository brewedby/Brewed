// Profile types extracted to a leaf module so pure helpers in
// lib/profileHelpers.ts can import them without dragging in the
// Supabase client (which is imported by lib/queries/profile.ts and
// requires env vars at import time — that would break the test
// runner). The hook file (lib/queries/profile.ts) re-exports these
// from its public surface for unchanged application imports.

export interface Metric {
  id: string;
  name: string;
  unit: string;
  enabled: boolean;
  builtin?: boolean;
  [key: string]: unknown;
}

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'in_grace_period'
  | 'in_billing_retry'
  | 'expired'
  | 'revoked';

export interface UserProfile {
  id: string;
  business_name: string | null;
  business_type: string;
  currency: string;
  custom_metrics: Metric[];
  subscription_status: SubscriptionStatus;
  subscription_product_id: string | null;
  subscription_expires_at: string | null;
  subscription_will_renew: boolean;
  reviewer_grandfathered: boolean;
}
