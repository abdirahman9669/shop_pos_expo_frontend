// src/components/TotalsRibbon.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, space } from '@/src/theme';

export type TotalsRibbonProps = {
  subtotalUSD: number | string | null | undefined;
  discountUSD?: number | string | null;
  taxUSD?: number | string | null;
  fxGainUSD?: number | string | null;
  fxLossUSD?: number | string | null;
  grandTotalUSD: number | string | null | undefined;
};

// defensively coerce to number
const toNum = (v: any, d = 0) => {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
};

export function TotalsRibbon({
  subtotalUSD,
  discountUSD = 0,
  taxUSD = 0,
  fxGainUSD = 0,
  fxLossUSD = 0,
  grandTotalUSD,
}: TotalsRibbonProps) {
  const { theme: t } = useTheme();

  // normalize everything
  const subtotal   = toNum(subtotalUSD, 0);
  const discount   = toNum(discountUSD, 0);
  const tax        = toNum(taxUSD, 0);
  const fxGain     = toNum(fxGainUSD, 0);
  const fxLoss     = toNum(fxLossUSD, 0);
  const grandTotal = toNum(grandTotalUSD, Math.max(0, subtotal - discount + tax));

  const Row = ({ k, v, tone }: { k: string; v: string; tone?: 'danger' | 'success' }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={text('label', t.colors.textSecondary)}>{k}</Text>
      <Text style={text('label', tone ? t.colors[tone].base : t.colors.textPrimary)}>{v}</Text>
    </View>
  );

  return (
    <View
      style={{
        padding: 12,
        gap: space.xs,
        borderTopWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface2,
      }}
    >
      <Row k="Subtotal" v={`$ ${subtotal.toFixed(2)}`} />
      {!!discount && <Row k="Discounts" v={`- $ ${discount.toFixed(2)}`} tone="danger" />}
      {!!tax && <Row k="Tax" v={`$ ${tax.toFixed(2)}`} />}
      {!!fxGain && <Row k="FX Gain" v={`$ ${fxGain.toFixed(4)}`} tone="success" />}
      {!!fxLoss && <Row k="FX Loss" v={`- $ ${fxLoss.toFixed(4)}`} tone="danger" />}

      <View style={{ height: 6 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={text('h3', t.colors.textPrimary)}>Grand Total</Text>
        <Text style={text('h3', t.colors.textPrimary)}>$ {grandTotal.toFixed(2)}</Text>
      </View>
    </View>
  );
}