import React from 'react';
import { Switch as RNSwitch, SwitchProps } from 'react-native';
import { useTheme } from '@/src/theme';

export type ThemedSwitchProps = SwitchProps & { tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' };

export function Switch({ value, onValueChange, disabled, tone = 'primary', ...rest }: ThemedSwitchProps) {
  const { theme: t } = useTheme();
  const c = t.colors[tone];

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: t.colors.border, true: c.surface }}
      thumbColor={value ? c.base : t.colors.surface3}
      ios_backgroundColor={t.colors.border}
      {...rest}
    />
  );
}
