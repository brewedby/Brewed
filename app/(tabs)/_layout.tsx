import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/themeContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  color,
}: {
  name: { filled: IoniconName; outline: IoniconName };
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={focused ? name.filled : name.outline} size={22} color={color} />;
}

const ICONS: Record<string, { filled: IoniconName; outline: IoniconName }> = {
  dashboard: { filled: 'bar-chart',       outline: 'bar-chart-outline' },
  events:    { filled: 'calendar-number', outline: 'calendar-number-outline' },
  companies: { filled: 'business',        outline: 'business-outline' },
  discover:  { filled: 'compass',         outline: 'compass-outline' },
  settings:  { filled: 'settings',        outline: 'settings-outline' },
};

const TAB_LISTENERS = {
  tabPress: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const p = tokens.palette;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: p.surface,
          borderTopColor: p.border,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: 56 + bottomPadding,
        },
        tabBarActiveTintColor: p.brand,
        tabBarInactiveTintColor: p.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen name="dashboard" listeners={TAB_LISTENERS} options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.dashboard} focused={focused} color={color} /> }} />
      <Tabs.Screen name="events"    listeners={TAB_LISTENERS} options={{ title: 'Events',    tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.events}    focused={focused} color={color} /> }} />
      <Tabs.Screen name="companies" listeners={TAB_LISTENERS} options={{ title: 'Companies', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.companies} focused={focused} color={color} /> }} />
      <Tabs.Screen name="discover"  listeners={TAB_LISTENERS} options={{ title: 'Discover',  tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.discover}  focused={focused} color={color} /> }} />
      <Tabs.Screen name="settings"  listeners={TAB_LISTENERS} options={{ title: 'Settings',  tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.settings}  focused={focused} color={color} /> }} />

      {/* Hidden screens — still navigable via router.push.
          Fleet and Reports were moved to /(modal)/fleet and /(modal)/reports
          so they get the same pull-down-to-dismiss treatment as Menu/COGS. */}
      <Tabs.Screen name="calendar" options={{ href: null }} />
    </Tabs>
  );
}
