// src/components/SplitTender.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, text, space, radius, border } from '@/src/theme';
import { MoneyInput } from './MoneyInput';

export type SplitTenderState = {
  usd: string;  // $ portion
  sos: string;  // SOS portion (grouped string)
  card: string; // card in USD
};

export type SplitTenderProps = {
  dueUSD: number;
  state: SplitTenderState | undefined;            // may come in undefined during init
  onChange: (next: SplitTenderState) => void;
  accountingRate: number;                         // SOS per USD
};

const DEFAULT_STATE: SplitTenderState = { usd: '0', sos: '0', card: '0' };

// safe numeric parser (accepts "", "1,234", etc.)
const num = (v: unknown) => {
  const s = String(v ?? '').replace(/,/g, '');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export function SplitTender({ dueUSD, state, onChange, accountingRate }: SplitTenderProps) {
  const { theme: t } = useTheme();

  // normalize inputs
  const st = state ?? DEFAULT_STATE;
  const rate = Number.isFinite(accountingRate) && accountingRate > 0 ? accountingRate : 0;

  const paidUSD = useMemo(() => {
    const usd = num(st.usd);
    const card = num(st.card);
    const sosLong = Math.round(num(st.sos));   // SOS integer (grouped text allowed)
    const sosUSD = rate > 0 ? sosLong / rate : 0;
    return usd + card + sosUSD;
  }, [st.usd, st.card, st.sos, rate]);

  const remaining = Math.max(0, (Number.isFinite(dueUSD) ? dueUSD : 0) - paidUSD);
  const change = Math.max(0, paidUSD - (Number.isFinite(dueUSD) ? dueUSD : 0));

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: t.colors.surface3,
          borderColor: t.colors.border,
          borderRadius: radius.lg,
          borderWidth: border.thin,
        },
      ]}
    >
      <Text style={text('h3', t.colors.textPrimary)}>Split Tender</Text>

      <MoneyInput
        label="Cash (USD)"
        value={st.usd}
        onChangeText={(v) => onChange({ ...st, usd: v })}
        currency="USD"
        {...({} as any)}
      />

      <MoneyInput
        label="Card (USD)"
        value={st.card}
        onChangeText={(v) => onChange({ ...st, card: v })}
        currency="USD"
        {...({} as any)}
      />

      <MoneyInput
        label={`Cash (SOS @ ${rate ? Math.round(rate) : 0})`}
        value={st.sos}
        onChangeText={(v) => onChange({ ...st, sos: v })}
        currency="SOS"
        {...({} as any)}
      />

      <View style={{ height: space.sm }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={text('label', t.colors.textSecondary)}>Remaining</Text>
        <Text style={text('label', remaining ? t.colors.warning.base : t.colors.textSecondary)}>
          $ {remaining.toFixed(2)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={text('label', t.colors.textSecondary)}>Change</Text>
        <Text style={text('label', change ? t.colors.info.base : t.colors.textSecondary)}>
          $ {change.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 12, gap: 10 },
});