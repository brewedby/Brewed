// Supabase Edge Function: validate-apple-receipt
//
// Verifies an App Store transaction receipt with Apple, then writes
// the resulting subscription state to the user's profile row.
//
// Why server-side: the client cannot be trusted to set its own
// subscription_status. A DB trigger blocks client writes to subscription
// columns; only the service-role key (held by this function) can update them.
//
// Deploy:
//   supabase functions deploy validate-apple-receipt --no-verify-jwt
//   (we verify JWT manually below so we can return JSON errors)
//
// Required secrets:
//   APPLE_SHARED_SECRET     — App-Specific Shared Secret from App Store Connect
//                              (Users → My Apps → Brewed → App Information → App-Specific Shared Secret)
//   ALLOWED_PRODUCT_IDS     — comma-separated list, e.g. "com.brewedbyboon.app.pro.monthly"
//
// Apple's receipt verification endpoints:
//   - Production: https://buy.itunes.apple.com/verifyReceipt
//   - Sandbox:    https://sandbox.itunes.apple.com/verifyReceipt
// Apple's documentation says: always try production first; if you receive
// status 21007, retry against sandbox.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APPLE_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

interface AppleLatestReceiptInfo {
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  expires_date_ms?: string;
  is_trial_period?: string;
  cancellation_date_ms?: string;
}

interface ApplePendingRenewalInfo {
  product_id: string;
  original_transaction_id: string;
  auto_renew_status: '0' | '1';
  expiration_intent?: string;
  is_in_billing_retry_period?: '0' | '1';
  grace_period_expires_date_ms?: string;
}

interface AppleVerifyResponse {
  status: number;
  environment?: 'Sandbox' | 'Production';
  receipt?: { in_app?: AppleLatestReceiptInfo[] };
  latest_receipt_info?: AppleLatestReceiptInfo[];
  pending_renewal_info?: ApplePendingRenewalInfo[];
}

async function verifyWithApple(receiptData: string, password: string, useSandbox: boolean): Promise<AppleVerifyResponse> {
  const url = useSandbox ? APPLE_SANDBOX : APPLE_PROD;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password,
      'exclude-old-transactions': true,
    }),
  });
  return (await res.json()) as AppleVerifyResponse;
}

function pickLatestForAllowedProduct(
  resp: AppleVerifyResponse,
  allowedProductIds: string[],
): { latest: AppleLatestReceiptInfo; renewal?: ApplePendingRenewalInfo } | null {
  const all = [...(resp.latest_receipt_info ?? []), ...(resp.receipt?.in_app ?? [])]
    .filter((tx) => allowedProductIds.includes(tx.product_id))
    .sort((a, b) => Number(b.expires_date_ms ?? 0) - Number(a.expires_date_ms ?? 0));
  if (!all[0]) return null;
  const latest = all[0];
  const renewal = resp.pending_renewal_info?.find((r) => r.original_transaction_id === latest.original_transaction_id);
  return { latest, renewal };
}

function deriveStatus(latest: AppleLatestReceiptInfo, renewal: ApplePendingRenewalInfo | undefined, now = Date.now()): {
  status: 'active' | 'in_grace_period' | 'in_billing_retry' | 'expired' | 'revoked';
  expiresAt: string | null;
  willRenew: boolean;
} {
  const expiresMs = Number(latest.expires_date_ms ?? 0);
  const cancelledMs = Number(latest.cancellation_date_ms ?? 0);
  const willRenew = renewal?.auto_renew_status === '1';
  const expiresAt = expiresMs > 0 ? new Date(expiresMs).toISOString() : null;

  if (cancelledMs > 0) return { status: 'revoked', expiresAt, willRenew: false };

  // Apple grace period applies if billing fails but user is given access for a few days
  const graceMs = renewal?.grace_period_expires_date_ms ? Number(renewal.grace_period_expires_date_ms) : 0;
  if (expiresMs < now && graceMs > now) return { status: 'in_grace_period', expiresAt: new Date(graceMs).toISOString(), willRenew };

  if (renewal?.is_in_billing_retry_period === '1') return { status: 'in_billing_retry', expiresAt, willRenew };

  if (expiresMs > now) return { status: 'active', expiresAt, willRenew };
  return { status: 'expired', expiresAt, willRenew };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');
    const allowedProductIds = (Deno.env.get('ALLOWED_PRODUCT_IDS')
      ?? 'com.brewedbyboon.app.pro.monthly,com.brewedbyboon.app.trader.monthly')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!sharedSecret) {
      return new Response(JSON.stringify({ ok: false, error: 'APPLE_SHARED_SECRET not configured' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Auth: identify the user from the bearer token (anon-key JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization header' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const { receiptData } = await req.json();
    if (!receiptData || typeof receiptData !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'receiptData (string) is required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Try production first; on 21007 retry against sandbox
    let resp = await verifyWithApple(receiptData, sharedSecret, false);
    if (resp.status === 21007) resp = await verifyWithApple(receiptData, sharedSecret, true);

    if (resp.status !== 0) {
      return new Response(JSON.stringify({ ok: false, error: `Apple verification failed (status ${resp.status})` }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const picked = pickLatestForAllowedProduct(resp, allowedProductIds);
    if (!picked) {
      return new Response(JSON.stringify({ ok: false, error: 'No matching product in receipt' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { latest, renewal } = picked;
    const { status, expiresAt, willRenew } = deriveStatus(latest, renewal);

    // Service-role write — only this function can set subscription columns
    const admin = createClient(supabaseUrl, serviceKey);

    // Anti-fraud: if a DIFFERENT user's profile already owns this original_transaction_id,
    // refuse to assign it to the current user (Apple ID sharing / receipt theft).
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('apple_original_transaction_id', latest.original_transaction_id)
      .neq('id', userId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: false, error: 'This subscription is associated with another account.' }), {
        status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        subscription_status: status,
        subscription_product_id: latest.product_id,
        subscription_expires_at: expiresAt,
        subscription_environment: resp.environment ?? 'Production',
        apple_original_transaction_id: latest.original_transaction_id,
        apple_latest_transaction_id: latest.transaction_id,
        subscription_validated_at: new Date().toISOString(),
        subscription_will_renew: willRenew,
      })
      .eq('id', userId);

    if (updateErr) {
      return new Response(JSON.stringify({ ok: false, error: updateErr.message }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, status, expiresAt, willRenew }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
