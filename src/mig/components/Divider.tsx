import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/src/theme';

export function Divider({ inset = 0 }: { inset?: number }) {
  const { theme: t } = useTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.border, marginLeft: inset }} />;
}
