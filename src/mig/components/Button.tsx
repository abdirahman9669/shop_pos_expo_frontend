import React from 'react';
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme, text, radius, elevation, motion } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
  left?: React.ReactNode;
  right?: React.ReactNode;
  fullWidth?: boolean;
  elevationLevel?: 0|1|2|3|4;
  testID?: string;
};

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  style,
  left,
  right,
  fullWidth,
  elevationLevel = 1,
  testID,
}: ButtonProps) {
  const { theme: t } = useTheme();

  const v = {
    primary:   t.colors.primary,
    secondary: t.colors.secondary,
    danger:    t.colors.danger,
    success:   t.colors.success,
    warning:   t.colors.warning,
    ghost:     { base: 'transparent', onBase: t.colors.textPrimary, surface: 'transparent', onSurface: t.colors.textPrimary, border: t.colors.border },
  }[variant];

  const paddings = { sm: 10, md: 12, lg: 14 } as const;
  const font = { sm: 'label' as const, md: 'label' as const, lg: 'label' as const }[size];
  const opacity = disabled ? t.states.disabled : 1;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={disabled || loading ? undefined : onPress}
      style={[
        styles.base,
        elevationLevel ? elevation[elevationLevel] : undefined,
        {
          backgroundColor: variant === 'ghost' ? 'transparent' : v.base,
          paddingVertical: paddings[size],
          paddingHorizontal: fullWidth ? 16 : 14,
          borderRadius: radius.md,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: v.border,
          opacity,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      testID={testID}
    >
      {left ? <>{left}</> : null}
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? t.colors.textPrimary : v.onBase} style={{ marginHorizontal: 6 }} />
      ) : (
        <Text style={[text(font, variant === 'ghost' ? t.colors.textPrimary : v.onBase), styles.title]}>
          {title}
        </Text>
      )}
      {right ? <>{right}</> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
  title: { includeFontPadding: false },
});
