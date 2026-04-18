import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

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
  dashboard: { filled: 'bar-chart', outline: 'bar-chart-outline' },
  events: { filled: 'calendar-number', outline: 'calendar-number-outline' },
  calendar: { filled: 'calendar', outline: 'calendar-outline' },
  fleet: { filled: 'car', outline: 'car-outline' },
  companies: { filled: 'business', outline: 'business-outline' },
  discover: { filled: 'compass', outline: 'compass-outline' },
  settings: { filled: 'settings', outline: 'settings-outline' },
};

const TAB_LISTENERS = {
  tabPress: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1c1917', borderTopColor: '#292524', paddingBottom: 4 },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#78716c',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard" listeners={TAB_LISTENERS} options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.dashboard} focused={focused} color={color} /> }} />
      <Tabs.Screen name="events" listeners={TAB_LISTENERS} options={{ title: 'Events', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.events} focused={focused} color={color} /> }} />
      <Tabs.Screen name="calendar" listeners={TAB_LISTENERS} options={{ title: 'Calendar', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.calendar} focused={focused} color={color} /> }} />
      <Tabs.Screen name="fleet" listeners={TAB_LISTENERS} options={{ title: 'Fleet', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.fleet} focused={focused} color={color} /> }} />
      <Tabs.Screen name="companies" listeners={TAB_LISTENERS} options={{ title: 'Companies', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.companies} focused={focused} color={color} /> }} />
      <Tabs.Screen name="discover" listeners={TAB_LISTENERS} options={{ title: 'Discover', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.discover} focused={focused} color={color} /> }} />
      <Tabs.Screen name="settings" listeners={TAB_LISTENERS} options={{ title: 'Settings', tabBarIcon: ({ focused, color }) => <TabIcon name={ICONS.settings} focused={focused} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
