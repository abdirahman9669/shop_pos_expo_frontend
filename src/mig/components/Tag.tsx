import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme, text, radius, border, space } from '@/src/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';

export function Tag({ label, tone = 'neutral', style }: { label: string; tone?: Tone; style?: ViewStyle }) {
  const { theme: t } = useTheme();
  const c = t.colors[tone === 'neutral' ? 'neutral' : tone];

  return (
    <View style={[
      styles.base,
      {
        backgroundColor: c.surface,
        borderColor: c.border,
        borderRadius: radius.pill,
        borderWidth: border.thin,
      },
      style,
    ]}>
      <Text style={text('caption', c.onSurface)}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: space.sm, paddingVertical: 4, alignSelf: 'flex-start' },
});
