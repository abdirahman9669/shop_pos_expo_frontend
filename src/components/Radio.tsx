import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme, text, space } from '@/src/theme';

export type RadioProps = {
  selected: boolean;
  onChange?: () => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
};

export function Radio({ selected, onChange, label, disabled, style, tone = 'primary' }: RadioProps) {
  const { theme: t } = useTheme();
  const c = t.colors[tone];

  return (
    <Pressable
      onPress={() => !disabled && onChange?.()}
      style={[styles.row, style, { opacity: disabled ? t.states.disabled : 1, gap: space.sm, alignItems: 'center' }]}
    >
      <View
        style={[
          styles.outer,
          { borderColor: selected ? c.base : t.colors.border, backgroundColor: t.colors.surface3 },
        ]}
      >
        {selected ? <View style={[styles.inner, { backgroundColor: c.base }]} /> : null}
      </View>
      {label ? <Text style={text('body', t.colors.textPrimary)}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  outer: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5 },
});
