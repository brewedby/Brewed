/**
 * SubscriptionContext — global entitlement state.
 *
 * Source of truth for "is this user paid?" is the server-side
 * `profiles.subscription_status` column, which is written ONLY by
 * the validate-apple-receipt Edge Function. The client cannot forge
 * subscription state (DB trigger blocks it).
 *
 * Flow:
 *   1. App boots → useProfile() reads subscription_status from server
 *   2. User taps Subscribe → expo-iap requests purchase from Apple
 *   3. Apple returns transaction → we POST receipt to validate-apple-receipt
 *   4. Edge Function calls Apple verifyReceipt → updates profiles
 *   5. We refetch profile → entitlement updates
 *
 * Restore Purchases tells expo-iap to re-fetch active purchases from Apple
 * for the signed-in Apple ID, then we re-validate any returned receipt.
 *
 * NOTE: `expo-iap` is a native module. Run `npx expo prebuild` and rebuild
 * via EAS after first install. See docs/APP_STORE_LAUNCH.md.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';
import { ALL_PRODUCT_IDS, FALLBACK_PRICE, FALLBACK_PRICES, PRODUCT_IDS, type ProductId } from './products';
import { hasFeature, tierForSubscription, type FeatureKey, type SubscriptionTier } from './entitlements';
import { getDevTierOverride } from './devEntitlement';

// expo-iap types we care about, matching the INSTALLED 2.9.7 API surface.
// We import the runtime via require() so that builds without the native
// module installed don't crash at import time.
//
// 2.9.7 contract notes (verified against node_modules/expo-iap/build):
//  - Products expose the identifier as `id` (ProductCommon), NOT `productId`.
//  - requestPurchase takes a PLATFORM-KEYED request: { request: { ios: { sku } }, type }.
//    The legacy flat { sku } shape throws 'Invalid request for iOS…' before
//    any StoreKit call — it must never be used.
//  - Purchases carry `transactionReceipt` as a StoreKit 2 JWS. Our Edge
//    Function speaks Apple's legacy /verifyReceipt, which needs the base64
//    APP RECEIPT — so validation must send getReceiptIOS(), not the JWS.
//  - finishTransaction (iOS) reads `purchase.id`.
type StoreSubscriptionProduct = {
  id: string;
  title: string;
  description: string;
  displayPrice: string;            // localised, e.g. "£9.00"
  price?: number;                  // numeric
  currency: string;                // e.g. "GBP"
};

type IapPurchase = {
  id?: string;
  productId: string;
  transactionId?: string;
  /** StoreKit 2 JWS — NOT a legacy app receipt. See note above. */
  transactionReceipt?: string;
};

type IapModule = {
  initConnection: () => Promise<boolean>;
  endConnection: () => Promise<boolean>;
  getSubscriptions: (skus: string[]) => Promise<StoreSubscriptionProduct[]>;
  requestPurchase: (args: {
    request: { ios: { sku: string }; android?: { skus: string[] } };
    type: 'subs' | 'inapp';
  }) => Promise<unknown>;
  getAvailablePurchases: () => Promise<IapPurchase[]>;
  /** Base64 app receipt from the app bundle — what /verifyReceipt expects. */
  getReceiptIOS: () => Promise<string>;
  finishTransaction: (params: { purchase: IapPurchase; isConsumable: boolean }) => Promise<unknown>;
  purchaseUpdatedListener: (cb: (purchase: IapPurchase) => void) => { remove: () => void };
  purchaseErrorListener: (cb: (error: { code?: string; message?: string }) => void) => { remove: () => void };
};

function loadIap(): IapModule | null {
  // Only iOS has Apple IAP; Android would use Google Play Billing.
  if (Platform.OS !== 'ios') return null;
  // Skip in Expo Go (legacy + modern SDK detection). expo-iap is a native
  // module that is not linked into Expo Go's runtime.
  if ((Constants as unknown as { appOwnership?: string }).appOwnership === 'expo') return null;
  if (Constants.executionEnvironment === 'storeClient') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-iap') as IapModule;
  } catch {
    return null;
  }
}

interface SubscriptionContextValue {
  isReady: boolean;
  isEntitled: boolean;
  /** Resolved subscription tier: 'none' | 'trader' | 'pro'. */
  tier: SubscriptionTier;
  /** False while the profile (and therefore subscription state) hasn't
   *  loaded — feature gates degrade OPEN in that window. */
  statusKnown: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  /** Store products keyed by product id (localised prices). */
  products: Partial<Record<ProductId, StoreSubscriptionProduct>>;
  product: StoreSubscriptionProduct | null;
  displayPrice: string;
  /** Localised per-plan price with fallback. */
  priceFor: (productId: ProductId) => string;
  expiresAt: string | null;
  willRenew: boolean;
  purchase: (productId?: ProductId) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isReady: false,
  isEntitled: false,
  tier: 'none',
  statusKnown: false,
  isPurchasing: false,
  isRestoring: false,
  products: {},
  product: null,
  displayPrice: FALLBACK_PRICE,
  priceFor: (id) => FALLBACK_PRICES[id],
  expiresAt: null,
  willRenew: false,
  purchase: async () => {},
  restore: async () => {},
  refresh: async () => {},
});

async function postReceiptForValidation(receipt: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('validate-apple-receipt', {
    body: { receiptData: receipt },
  });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === 'object' && 'ok' in data && data.ok) return { ok: true };
  return { ok: false, error: data?.error ?? 'Validation failed' };
}

/**
 * The receipt our Edge Function can verify. Apple's legacy /verifyReceipt
 * endpoint (which validate-apple-receipt speaks) requires the base64 APP
 * RECEIPT from the bundle — NOT purchase.transactionReceipt, which in
 * expo-iap 2.9.7 is a StoreKit 2 JWS that /verifyReceipt rejects with
 * status 21002. Sending the JWS meant every purchase charged the user but
 * never activated, and every restore failed.
 */
async function getVerifiableReceipt(iap: IapModule, fallbackJws?: string): Promise<string | null> {
  try {
    const appReceipt = await iap.getReceiptIOS();
    if (appReceipt && appReceipt.length > 0) return appReceipt;
  } catch { /* fall through to JWS-based fallback below */ }
  return fallbackJws && fallbackJws.length > 0 ? fallbackJws : null;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();

  const [iap] = useState<IapModule | null>(() => loadIap());
  const [isReady, setIsReady] = useState(false);
  const [products, setProducts] = useState<Partial<Record<ProductId, StoreSubscriptionProduct>>>({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Derive entitlement from server-validated profile. Reviewer grandfather bypasses.
  const isEntitled = useMemo(() => {
    if (!profile) return false;
    if (profile.reviewer_grandfathered) return true;
    if (profile.subscription_status === 'active' || profile.subscription_status === 'in_grace_period') {
      const expires = profile.subscription_expires_at ? new Date(profile.subscription_expires_at).getTime() : Number.MAX_SAFE_INTEGER;
      // 24h grace beyond expiry to ride out Apple's renewal lag
      return expires > Date.now() - 24 * 60 * 60 * 1000;
    }
    return false;
  }, [profile]);

  // Tier resolution lives in lib/iap/entitlements.ts — single source of truth.
  const statusKnown = !!profile;
  const serverTier = useMemo<SubscriptionTier>(() => {
    if (!isEntitled) return 'none';
    return tierForSubscription({
      status: profile?.subscription_status,
      productId: profile?.subscription_product_id,
      grandfathered: profile?.reviewer_grandfathered,
    });
  }, [isEntitled, profile]);

  // DEV-ONLY tier override for testing gates. getDevTierOverride() is a
  // hard no-op (returns null) outside __DEV__, and this only affects
  // feature gates — the layout paywall keeps using server-derived
  // isEntitled, so a production build can never unlock via this path.
  const [devTier, setDevTier] = useState<SubscriptionTier | null>(null);
  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;
    getDevTierOverride().then((t) => { if (!cancelled) setDevTier(t); });
    return () => { cancelled = true; };
  }, [profile]);
  const tier = __DEV__ && devTier !== null ? devTier : serverTier;

  // Connect to the App Store and fetch product details once at mount
  useEffect(() => {
    if (!iap) {
      setIsReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await iap.initConnection();
        const fetched = await iap.getSubscriptions(ALL_PRODUCT_IDS);
        if (!cancelled && fetched.length > 0) {
          const byId: Partial<Record<ProductId, StoreSubscriptionProduct>> = {};
          for (const prod of fetched) {
            // 2.9.7 products carry the identifier as `id`. Tolerate a
            // legacy `productId` field so an SDK bump can't silently
            // empty the map again (which made the paywall show the
            // hardcoded fallback prices forever).
            const identifier = prod.id ?? (prod as { productId?: string }).productId;
            if (identifier && (ALL_PRODUCT_IDS as string[]).includes(identifier)) {
              byId[identifier as ProductId] = { ...prod, id: identifier };
            }
          }
          setProducts(byId);
        }
      } catch {
        // Connection failure → user will see the fallback price; surface a
        // friendly error only when they actually try to purchase.
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
      iap.endConnection().catch(() => {});
    };
  }, [iap]);

  // Listen for purchase updates (after the system sheet returns)
  useEffect(() => {
    if (!iap || !user) return;
    const updateSub = iap.purchaseUpdatedListener(async (purchase) => {
      // Validate with the app receipt, not purchase.transactionReceipt —
      // see getVerifiableReceipt. The purchase object is still what we
      // finish (finishTransaction reads purchase.id).
      const receipt = await getVerifiableReceipt(iap, purchase.transactionReceipt);
      if (!receipt) {
        Alert.alert('Could not verify subscription', 'No receipt was available from the App Store. Please try Restore Purchases.');
        return;
      }
      const result = await postReceiptForValidation(receipt);
      if (result.ok) {
        await iap.finishTransaction({ purchase, isConsumable: false });
        await qc.invalidateQueries({ queryKey: ['profile', user.id] });
      } else {
        Alert.alert('Could not verify subscription', result.error ?? 'Please try Restore Purchases.');
      }
    });
    const errorSub = iap.purchaseErrorListener((error) => {
      // Code "E_USER_CANCELLED" is expected — ignore. Surface other errors.
      if (error.code === 'E_USER_CANCELLED') return;
      Alert.alert('Purchase failed', error.message ?? 'Please try again.');
    });
    return () => {
      updateSub.remove();
      errorSub.remove();
    };
  }, [iap, user, qc]);

  const purchase = useCallback(async (productId: ProductId = PRODUCT_IDS.proMonthly) => {
    if (!iap) {
      Alert.alert('In-app purchases unavailable', 'Subscriptions are only available on iOS at this time.');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before subscribing.');
      return;
    }
    setIsPurchasing(true);
    try {
      // 2.9.7 requires the platform-keyed request shape. The legacy flat
      // { sku } object made requestPurchase read request.ios (undefined)
      // and throw before the StoreKit sheet ever appeared — every
      // subscribe tap failed with 'Invalid request for iOS…'.
      await iap.requestPurchase({ request: { ios: { sku: productId } }, type: 'subs' });
      // Result is delivered to purchaseUpdatedListener
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase failed', e.message ?? 'Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [iap, user]);

  const restore = useCallback(async () => {
    if (!iap) {
      Alert.alert('Restore unavailable', 'Restore Purchases is only available on iOS.');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before restoring.');
      return;
    }
    setIsRestoring(true);
    try {
      const purchases = await iap.getAvailablePurchases();
      const sub = purchases.find((p) => ALL_PRODUCT_IDS.includes(p.productId as ProductId));
      if (!sub) {
        Alert.alert('No subscription found', 'No active Brewed subscription was found on this Apple ID.');
        return;
      }
      const receipt = await getVerifiableReceipt(iap, sub.transactionReceipt);
      if (!receipt) {
        Alert.alert('Could not restore', 'No receipt was available from the App Store. Please relaunch the app and try again.');
        return;
      }
      const result = await postReceiptForValidation(receipt);
      if (result.ok) {
        await qc.invalidateQueries({ queryKey: ['profile', user.id] });
        Alert.alert('Restored', 'Your subscription has been restored.');
      } else {
        Alert.alert('Could not restore', result.error ?? 'Please try again later.');
      }
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [iap, user, qc]);

  const refresh = useCallback(async () => {
    if (!user) return;
    await qc.invalidateQueries({ queryKey: ['profile', user.id] });
  }, [user, qc]);

  const product = products[PRODUCT_IDS.proMonthly] ?? null;
  const displayPrice = product?.displayPrice
    ? `${product.displayPrice} / month`
    : FALLBACK_PRICE;

  const priceFor = useCallback((productId: ProductId): string => {
    const p = products[productId];
    return p?.displayPrice ? `${p.displayPrice} / month` : FALLBACK_PRICES[productId];
  }, [products]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    isReady,
    isEntitled,
    tier,
    statusKnown,
    isPurchasing,
    isRestoring,
    products,
    product,
    displayPrice,
    priceFor,
    expiresAt: profile?.subscription_expires_at ?? null,
    willRenew: profile?.subscription_will_renew ?? false,
    purchase,
    restore,
    refresh,
  }), [isReady, isEntitled, tier, statusKnown, isPurchasing, isRestoring, products, product, displayPrice, priceFor, profile, purchase, restore, refresh]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

/**
 * THE way to gate a feature in UI code.
 *
 * Returns { allowed, tier, statusKnown }. `allowed` is true when the
 * user's tier covers the feature — or when subscription state hasn't
 * loaded (degrade open; the layout paywall is the hard gate).
 *
 *   const pdfImport = useFeature('pdf_import');
 *   if (!pdfImport.allowed) return <UpgradePrompt feature="pdf_import" />;
 */
export function useFeature(feature: FeatureKey): {
  allowed: boolean;
  tier: SubscriptionTier;
  statusKnown: boolean;
} {
  const { tier, statusKnown } = useSubscription();
  return {
    allowed: hasFeature(tier, feature, statusKnown),
    tier,
    statusKnown,
  };
}
