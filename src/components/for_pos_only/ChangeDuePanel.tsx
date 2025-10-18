// src/components/ChangeDuePanel.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, space, radius } from '@/src/theme';

export type ChangeDuePanelProps = {
  changeUSD?: number | string | null;  // computed from SplitTender
  suggest?: boolean;                   // show denomination suggestion
};

// helper to safely coerce to number
const toNum = (v: any, d = 0) => {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
};

export function ChangeDuePanel({ changeUSD = 0, suggest = true }: ChangeDuePanelProps) {
  const { theme: t } = useTheme();
  const amount = toNum(changeUSD, 0);

  // simple suggestion example (only when suggest is true)
  const suggestion =
    suggest && amount >= 1
      ? `${Math.floor(amount)}×$1 + ${(amount - Math.floor(amount)).toFixed(2)}`
      : `$${amount.toFixed(2)}`;

  return (
    <View
      style={{
        padding: 12,
        borderRadius: radius.md,
        backgroundColor: t.colors.info.surface,
      }}
    >
      <Text style={text('label', t.colors.info.onSurface)}>Change Due</Text>
      <Text style={text('h2', t.colors.info.onSurface)}>$ {amount.toFixed(2)}</Text>
      {suggest && (
        <Text style={text('caption', t.colors.info.onSurface)}>
          Suggestion: {suggestion}
        </Text>
      )}
    </View>
  );
}