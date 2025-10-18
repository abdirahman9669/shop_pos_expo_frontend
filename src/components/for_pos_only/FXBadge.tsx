// src/components/FXBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, radius, space } from '@/src/theme';

export function FXBadge({ counterRate, accountingRate }: { counterRate: number; accountingRate: number }) {
  const { theme: t } = useTheme();
  const diff = counterRate - accountingRate;
  const tone = diff === 0 ? t.colors.neutral : diff > 0 ? t.colors.danger : t.colors.success;
  const label = diff === 0 ? 'equal' : diff > 0 ? 'loss' : 'gain';

  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: tone.surface }}>
      <Text style={text('caption', tone.onSurface)}>
        Counter: {counterRate.toLocaleString()} • Accounting: {accountingRate.toLocaleString()} → {label}
      </Text>
    </View>
  );
}
