import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme, text, radius, border, space } from '@/src/theme';

export type CheckboxProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
};

export function Checkbox({ checked, onChange, label, disabled, style, tone = 'primary' }: CheckboxProps) {
  const { theme: t } = useTheme();
  const c = t.colors[tone];

  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!checked)}
      style={({ pressed }) => [
        styles.row,
        style,
        { opacity: disabled ? t.states.disabled : 1, gap: space.sm, alignItems: 'center' },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: radius.sm,
            borderWidth: border.thin,
            borderColor: checked ? c.base : t.colors.border,
            backgroundColor: checked ? c.base : t.colors.surface3,
          },
        ]}
      >
        {checked ? <Text style={text('label', c.onBase)}>✓</Text> : null}
      </View>
      {label ? <Text style={text('body', t.colors.textPrimary)}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  box: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
