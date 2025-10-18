// src/components/ShiftOpenClose.tsx
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTheme, text, space, radius, border } from '@/src/theme';

export type ShiftForm = {
  openingFloatUSD: string;
  paidInUSD: string;
  paidOutUSD: string;
  expectedUSD: number;
  countedUSD: string;
  note?: string;
};

type Props = {
  form?: Partial<ShiftForm>;                          // 👈 make optional for safety in demos
  onChange?: (f: Partial<ShiftForm>) => void;         // 👈 optional with noop default
};

export function ShiftOpenClose({ form, onChange = () => {} }: Props) {
  const { theme: t } = useTheme();

  // Safe defaults so UI never crashes if caller omits form
  const safeForm: Required<ShiftForm> = {
    openingFloatUSD: String(form?.openingFloatUSD ?? ''),
    paidInUSD:       String(form?.paidInUSD ?? ''),
    paidOutUSD:      String(form?.paidOutUSD ?? ''),
    expectedUSD:     Number(form?.expectedUSD ?? 0),
    countedUSD:      String(form?.countedUSD ?? ''),
    note:            String(form?.note ?? ''),
  };

  const Row = ({
    label,
    keyName,
    placeholder,
  }: {
    label: string;
    keyName: keyof ShiftForm;
    placeholder?: string;
  }) => (
    <View>
      <Text style={text('label', t.colors.textSecondary)}>{label}</Text>
      <TextInput
        value={String(safeForm[keyName] ?? '')}
        onChangeText={(v) => onChange({ [keyName]: v } as Partial<ShiftForm>)}
        keyboardType="decimal-pad"
        placeholder={placeholder || '0.00'}
        placeholderTextColor={t.colors.textSecondary}
        style={{
          padding: 12,
          borderWidth: border.thin,
          borderColor: t.colors.border,
          borderRadius: radius.md,
          color: t.colors.textPrimary,
          backgroundColor: t.colors.surface3,
        }}
      />
    </View>
  );

  const diff = Number(safeForm.countedUSD || 0) - Number(safeForm.expectedUSD || 0);

  return (
    <View style={{ gap: space.sm }}>
      <Row label="Opening Float (USD)" keyName="openingFloatUSD" />
      <Row label="Paid In (USD)" keyName="paidInUSD" />
      <Row label="Paid Out (USD)" keyName="paidOutUSD" />
      <Text style={text('body', t.colors.textSecondary)}>
        Expected: $ {Number(safeForm.expectedUSD || 0).toFixed(2)}
      </Text>
      <Row label="Counted (USD)" keyName="countedUSD" />
      <Text
        style={text(
          'label',
          diff === 0
            ? t.colors.textSecondary
            : diff > 0
            ? t.colors.success.base
            : t.colors.danger.base
        )}
      >
        {diff === 0
          ? 'Balanced'
          : diff > 0
          ? `Over by $ ${diff.toFixed(2)}`
          : `Short by $ ${Math.abs(diff).toFixed(2)}`}
      </Text>
    </View>
  );
}