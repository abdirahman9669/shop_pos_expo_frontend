// src/ux/Checklist.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, space } from '@/src/theme';

export function Checklist({ items }: { items: string[] }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ padding: 12, gap: 8, borderWidth: 1, borderColor: t.colors.border, borderRadius: 10, backgroundColor: t.colors.surface2 }}>
      {items.map((it, i) => (
        <Text key={i} style={text('bodySm', t.colors.textSecondary)}>• {it}</Text>
      ))}
    </View>
  );
}
