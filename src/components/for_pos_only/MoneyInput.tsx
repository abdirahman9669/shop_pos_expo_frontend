// src/components/MoneyInput.tsx
import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, text, space, radius, border } from '@/src/theme';

export type MoneyInputProps = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  currency: 'USD' | 'SOS';
  onToggleCurrency?: () => void;
  errorText?: string;
  helperText?: string;
  disabled?: boolean;
  keyboardType?: 'decimal-pad'|'number-pad';
};

export function MoneyInput({
  label, value, onChangeText, currency,
  onToggleCurrency, errorText, helperText, disabled, keyboardType = 'decimal-pad',
}: MoneyInputProps) {
  const { theme: t } = useTheme();

  const formatted = useMemo(() => {
    if (currency === 'SOS') {
      const n = Number(value.replace(/,/g, ''));
      return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : value;
    }
    return value; // USD keep decimals user-entered
  }, [value, currency]);

  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={text('label', t.colors.textSecondary)}>{label}</Text>}
      <View
        style={[
          styles.row,
          {
            borderColor: errorText ? t.colors.danger.base : t.colors.border,
            backgroundColor: t.colors.surface3,
            borderRadius: radius.md,
          },
        ]}
      >
        <TextInput
          value={formatted}
          onChangeText={onChangeText}
          editable={!disabled}
          keyboardType={keyboardType}
          style={[styles.input, { color: t.colors.textPrimary }]}
          placeholder={currency === 'USD' ? '0.00' : '0'}
          placeholderTextColor={t.colors.textSecondary}
        />
        {!!onToggleCurrency && (
          <TouchableOpacity onPress={onToggleCurrency} activeOpacity={0.85} style={styles.curBtn}>
            <Text style={text('label', t.colors.primary.base)}>{currency}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!helperText && !errorText && <Text style={text('caption', t.colors.textSecondary)}>{helperText}</Text>}
      {!!errorText && <Text style={text('caption', t.colors.danger.base)}>{errorText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: border.thin, paddingHorizontal: 10, height: 48 },
  input: { flex: 1, fontSize: 18, fontWeight: '700' },
  curBtn: { paddingHorizontal: 8, paddingVertical: 6 },
});
