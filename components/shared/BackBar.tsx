import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/themeContext';
import { popTrailHref, decodeTrail } from '@/lib/navTrail';

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
 * is empty (the user landed here via a tab switch or deep link) the bar
 * falls back to `router.back()` with `fallbackLabel`.
 */
export function BackBar({ trail, fallbackLabel, rightAction, showCrumbs = false }: Props) {
  const router = useRouter();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const back = popTrailHref(trail);

  const handlePress = () => {
    if (back) {
      router.replace(back.href);
    } else {
      router.back();
    }
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
          onPress={handlePress}
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
      {showCrumbs && crumbs.length > 1 && (
        <View style={{
          paddingHorizontal: 20, paddingBottom: 8,
          flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
        }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.pathname}-${i}`}>
              <Text style={{ fontSize: 10, color: p.textFaint, letterSpacing: 0.5 }} numberOfLines={1}>
                {c.label}
              </Text>
              {i < crumbs.length - 1 && (
                <Text style={{ fontSize: 10, color: p.textFaint, marginHorizontal: 6 }}>›</Text>
              )}
            </React.Fragment>
          ))}
        </View>
      )}
    </>
  );
}
