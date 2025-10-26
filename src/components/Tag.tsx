import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme, text, radius, border, space } from '@/src/theme';

type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'primary'
  | 'secondary';

interface TagProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
  onPress?: () => void; // ✅ new
}

/**
 * Tag — a small pill component that can optionally be pressable.
 */
export function Tag({ label, tone = 'neutral', style, onPress }: TagProps) {
  const { theme: t } = useTheme();
  const c = t.colors[tone === 'neutral' ? 'neutral' : tone];

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderRadius: radius.pill,
          borderWidth: border.thin,
        },
        style,
      ]}
    >
      <Text style={text('caption', c.onSurface)}>{label}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});