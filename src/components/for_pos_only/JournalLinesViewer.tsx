// src/components/JournalLinesViewer.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, space, radius } from '@/src/theme';

export type JournalLine = {
  id: string;
  debit_account: string;
  credit_account: string;
  amount_usd: number;
  native_amount?: number;
  native_currency?: string;
};

export function JournalLinesViewer({ lines }: { lines: JournalLine[] }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {lines.map((l) => (
        <View key={l.id} style={{ padding: 10, borderRadius: radius.md, backgroundColor: t.colors.surface3, borderWidth: 1, borderColor: t.colors.border }}>
          <Text style={text('label', t.colors.textPrimary)}>{l.debit_account}  →  {l.credit_account}</Text>
          <Text style={text('caption', t.colors.textSecondary)}>
            USD {l.amount_usd.toFixed(4)}{l.native_amount ? ` • ${Math.round(l.native_amount)} ${l.native_currency}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}
