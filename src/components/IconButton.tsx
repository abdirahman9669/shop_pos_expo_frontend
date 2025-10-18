import React from 'react';
import { TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { useTheme, elevation, radius } from '@/src/theme';
import { ensureMinTouchSize } from '@/src/ux/touchable';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'primary' | 'secondary' | 'neutral' | 'ghost';

export type IconButtonProps = {
  children: React.ReactNode;          // your icon glyph
  onPress?: () => void;
  disabled?: boolean;
  size?: Size;
  variant?: Variant;
  style?: ViewStyle;
  elevationLevel?: 0|1|2|3|4;
  testID?: string;
};

const sizes: Record<Size, number> = { sm: 32, md: 40, lg: 48 };

export function IconButton({
  children,
  onPress,
  disabled,
  size = 'md',
  variant = 'neutral',
  style,
  elevationLevel = 0,
  testID,
}: IconButtonProps) {
  const { theme: t } = useTheme();
  const tone =
    variant === 'primary' ? t.colors.primary
    : variant === 'secondary' ? t.colors.secondary
    : variant === 'ghost' ? null
    : t.colors.neutral;

  return (
    <TouchableOpacity
        hitSlop={ensureMinTouchSize(32, 32)}
      testID={testID}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        elevationLevel ? elevation[elevationLevel] : undefined,
        {
          width: sizes[size],
          height: sizes[size],
          borderRadius: radius.round,
          backgroundColor: variant === 'ghost' ? 'transparent' : tone?.base,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? t.colors.border : 'transparent',
          opacity: disabled ? t.states.disabled : 1,
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
