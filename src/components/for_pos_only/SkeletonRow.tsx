// src/components/for_pos_only/SkeletonRow.tsx
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/src/theme';

export function SkeletonRow({ height = 44 }: { height?: number }) {
  const { theme: t } = useTheme?.() ?? { theme: { colors: {} as any } };
  const bg = t?.colors?.surface2 ?? '#E0E0E0';

  return (
    <View
      style={{
        height,
        backgroundColor: bg,
        borderRadius: 8,
        marginVertical: 4,
        opacity: 0.6,
      }}
    />
  );
}