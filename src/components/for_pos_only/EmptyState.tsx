// src/components/EmptyState.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, space } from '@/src/theme';
export function EmptyState({ title = 'Nothing here', subtitle }: { title?: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: space.lg }}>
      <Text style={text('h3', t.colors.textSecondary)}>{title}</Text>
      {subtitle ? <Text style={text('caption', t.colors.textSecondary)}>{subtitle}</Text> : null}
    </View>
  );
}
