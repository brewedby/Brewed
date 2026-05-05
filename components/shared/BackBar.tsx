import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { popTrailHref, decodeTrail, encodeTrail } from '@/lib/navTrail';
import type { Href } from 'expo-router';

interface Props {
  /** The encoded `trail` query param from useLocalSearchParams. */
  trail: string | undefined;
  /** Label to show when no trail is available. */
  fallbackLabel: string;
  /** Optional element rendered on the right (e.g. an EDIT button). */
  rightAction?: React.ReactNode;
  /** Show the full breadcrumb strip below the back button. */
  showCrumbs?: boolean;
}

/**
 * Reusable back button row used at the top of every detail screen.
 *
 * The back button label and target come from the URL trail. When the trail
 * is empty (the user landed via a tab switch or deep link) the bar falls
 * back to `router.back()` with `fallbackLabel`.
 *
 * Uses `router.navigate` rather than `router.replace` so cross-tab back
 * jumps reuse the existing screen instance if it's still in the stack
 * history rather than leaving a stale duplicate behind.
 */
export function BackBar({ trail, fallbackLabel, rightAction, showCrumbs = false }: Props) {
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const back = popTrailHref(trail);

  const handleBack = () => {
    if (back) {
      router.navigate(back.href);
    } else {
      router.back();
    }
  };

  const handleCrumbTap = (idx: number) => {
    // Navigate to crumb at idx, with the trail before it as that crumb's trail.
    const crumbs = decodeTrail(trail);
    const target = crumbs[idx];
    if (!target) return;
    const remaining = crumbs.slice(0, idx);
    const remainingEncoded = encodeTrail(remaining);
    const params: Record<string, string | number> = {};
    if (target.params) {
      for (const [k, v] of Object.entries(target.params)) {
        if (v !== undefined && v !== null && v !== '') params[k] = v;
      }
    }
    if (remainingEncoded) params.trail = remainingEncoded;
    router.navigate({ pathname: target.pathname, params } as Href);
  };

  const label = back?.label ?? fallbackLabel;
  const crumbs = showCrumbs ? decodeTrail(trail) : [];

  return (
    <>
      <View style={{
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${label}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, flex: 1, marginRight: 12 }}
        >
          <Ionicons name="chevron-back" size={14} color={p.brand} />
          <Text style={{ color: p.brand, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
            {label}
          </Text>
        </TouchableOpacity>
        {rightAction}
      </View>
      {showCrumbs && crumbs.length > 0 && (
        <View style={{
          paddingHorizontal: 20, paddingBottom: 8,
          flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
        }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.pathname}-${i}`}>
              <TouchableOpacity
                onPress={() => handleCrumbTap(i)}
                accessibilityRole="link"
                accessibilityLabel={`Jump to ${c.label}`}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text style={{ fontSize: 10, color: p.textMuted, letterSpacing: 0.5, textDecorationLine: 'underline' }} numberOfLines={1}>
                  {c.label}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: p.textFaint, marginHorizontal: 6 }}>›</Text>
            </React.Fragment>
          ))}
        </View>
      )}
    </>
  );
}
