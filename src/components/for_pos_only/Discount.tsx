// src/components/Discount.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme, text, space, radius, border } from '@/src/theme';

export type DiscountProps = {
  mode: 'amount' | 'percent';
  value: string;
  onChangeMode: (m: 'amount'|'percent') => void;
  onChangeValue: (v: string) => void;
  disabled?: boolean;
};

export function Discount({ mode, value, onChangeMode, onChangeValue, disabled }: DiscountProps) {
  const { theme: t } = useTheme();
  const Tab = ({ id, label }: { id: 'amount'|'percent'; label: string }) => {
    const on = mode === id;
    return (
      <TouchableOpacity
        onPress={() => onChangeMode(id)}
        style={{
          paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
          backgroundColor: on ? t.colors.primary.base : t.colors.surface3,
          borderWidth: border.thin, borderColor: on ? t.colors.primary.base : t.colors.border,
        }}
      >
        <Text style={text('label', on ? t.colors.primary.onBase : t.colors.textPrimary)}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ gap: space.sm }}>
      <Text style={text('label', t.colors.textSecondary)}>Discount</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Tab id="amount" label="Amount" />
        <Tab id="percent" label="Percent" />
      </View>
      <TextInput
        editable={!disabled}
        value={value}
        onChangeText={onChangeValue}
        keyboardType="decimal-pad"
        style={{
          borderWidth: border.thin, borderColor: t.colors.border, borderRadius: radius.md,
          padding: 12, color: t.colors.textPrimary, backgroundColor: t.colors.surface3,
        }}
        placeholder={mode === 'amount' ? '$ 0.00' : '0 %'}
        placeholderTextColor={t.colors.textSecondary}
      />
    </View>
  );
}
