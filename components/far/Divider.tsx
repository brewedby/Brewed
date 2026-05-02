import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/lib/themeContext';

// Solid hairline divider — RN's dashed border support is patchy on iOS,
// so we use a solid hairline instead. Visually close enough at small sizes.
export function FarDivider({ style }: { style?: object }) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        { height: 1, backgroundColor: tokens.palette.borderStrong, opacity: 0.6 },
        style,
      ]}
    />
  );
}
