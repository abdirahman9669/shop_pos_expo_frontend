// src/components/Button.tsx
import React, { useEffect } from 'react';
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme, text, radius, elevation } from '@/src/theme';
import { usePageActions } from '@/src/ux/PageActionsProvider';
import { ensureMinTouchSizeFromStyle } from '@/src/ux/touchable';

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'solid';            // ← NEW alias (maps to primary)

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
  elevationLevel?: 0 | 1 | 2 | 3 | 4;
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

  // Register "primary" buttons with PageActions
  const id = React.useId();
  const { registerPrimary, unregisterPrimary } = usePageActions();
  useEffect(() => {
    const key = variant === 'solid' ? 'primary' : variant; // treat solid as primary
    if (key === 'primary') {
      registerPrimary(id);
      return () => unregisterPrimary(id);
    }
    return;
  }, [variant, id, registerPrimary, unregisterPrimary]);

  // Normalize "solid" -> "primary" for styling
  const key = variant === 'solid' ? 'primary' : variant;

  const palette = {
    primary:   t.colors.primary,
    secondary: t.colors.secondary,
    danger:    t.colors.danger,
    success:   t.colors.success,
    warning:   t.colors.warning,
    ghost:     { base: 'transparent', onBase: t.colors.textPrimary, surface: 'transparent', onSurface: t.colors.textPrimary, border: t.colors.border },
  }[key];

  const paddings = { sm: 10, md: 12, lg: 14 } as const;
  const fontKey = { sm: 'label' as const, md: 'label' as const, lg: 'label' as const }[size];
  const opacity = disabled ? t.states.disabled : 1;

  const isGhost = key === 'ghost';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      hitSlop={ensureMinTouchSizeFromStyle([styles.base, { minHeight: 44 }, style])}
      activeOpacity={0.85}
      onPress={disabled || loading ? undefined : onPress}
      style={[
        styles.base,
        elevationLevel ? elevation[elevationLevel] : undefined,
        {
          backgroundColor: isGhost ? 'transparent' : (palette.base as string),
          paddingVertical: paddings[size],
          paddingHorizontal: fullWidth ? 16 : 14,
          borderRadius: radius.md,
          borderWidth: isGhost ? 1 : 0,
          borderColor: palette.border as string,
          opacity,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      testID={testID}
    >
      {left ? <>{left}</> : null}
      {loading ? (
        <ActivityIndicator color={isGhost ? (t.colors.textPrimary as string) : (palette.onBase as string)} style={{ marginHorizontal: 6 }} />
      ) : (
        <Text style={[text(fontKey, isGhost ? (t.colors.textPrimary as string) : (palette.onBase as string)), styles.title]}>
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