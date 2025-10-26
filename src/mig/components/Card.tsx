import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme, elevation, radius, layout, border } from '@/src/theme';

export type CardProps = ViewProps & { elevationLevel?: 0|1|2|3|4; padding?: number };

export function Card({ elevationLevel = 1, padding = layout.cardPadding, style, ...rest }: CardProps) {
  const { theme: t } = useTheme();
  return (
    <View
      style={[
        styles.base,
        elevation[elevationLevel],
        {
          backgroundColor: t.colors.surface3,
          borderColor: t.colors.border,
          borderRadius: radius.lg,
          padding,
          borderWidth: border.thin,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { width: '100%' },
});
