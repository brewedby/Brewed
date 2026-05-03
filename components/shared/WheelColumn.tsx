import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/lib/themeContext';

export const WHEEL_ITEM_HEIGHT = 48;
export const WHEEL_VISIBLE_ITEMS = 5;

interface WheelColumnProps {
  items: (string | number)[];
  initialIndex: number;
  onChange: (index: number) => void;
}

export function WheelColumn({ items, initialIndex, onChange }: WheelColumnProps) {
  const { tokens } = useTheme();
  const p = tokens.palette;
  const scrollRef = useRef<ScrollView>(null);
  const [selectedIdx, setSelectedIdx] = useState(
    Math.max(0, Math.min(initialIndex, items.length - 1)),
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedIdx = useRef<number>(selectedIdx);

  useEffect(() => {
    const safeIdx = Math.max(0, Math.min(initialIndex, items.length - 1));
    setSelectedIdx(safeIdx);
    lastReportedIdx.current = safeIdx;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: safeIdx * WHEEL_ITEM_HEIGHT, animated: false });
    }, 200);
  }, [initialIndex, items.length]);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  function handleScrollEnd(y: number) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const idx = Math.max(0, Math.min(Math.round(y / WHEEL_ITEM_HEIGHT), items.length - 1));
      if (idx === lastReportedIdx.current) return;
      lastReportedIdx.current = idx;
      setSelectedIdx(idx);
      onChange(idx);
    }, 50);
  }

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: WHEEL_ITEM_HEIGHT * 2,
          left: 4,
          right: 4,
          height: WHEEL_ITEM_HEIGHT,
          backgroundColor: p.surfaceAlt,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: p.border,
        }}
      />
      <ScrollView
        ref={scrollRef}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
        style={{ height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS }}
        onMomentumScrollEnd={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => handleScrollEnd(e.nativeEvent.contentOffset.y)}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={`${index}-${String(item)}`}
            style={{
              height: WHEEL_ITEM_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              setSelectedIdx(index);
              lastReportedIdx.current = index;
              onChange(index);
              scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
            }}
            activeOpacity={0.6}
          >
            <Text
              style={{
                fontSize: selectedIdx === index ? 17 : 15,
                fontWeight: selectedIdx === index ? '600' : '400',
                color: selectedIdx === index ? p.text : p.textFaint,
              }}
            >
              {String(item)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
