// app/sales/components/PaymentsPanel.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Rate = { accounting: number; sell: number; buy: number };

type Props = {
  usdAmount: string;
  sosAmount: string;
  rate: Rate;
  rateLoading?: boolean;
  onChangeUSD: (v: string) => void;
  onChangeSOS: (v: string) => void;
  onRefreshRate: () => void;
};

const n = (v: any, d = 0) => {
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : d;
};

export default function PaymentsPanel({
  usdAmount,
  sosAmount,
  rate,
  rateLoading,
  onChangeUSD,
  onChangeSOS,
  onRefreshRate,
}: Props) {
  return (
    <>
      <Text style={[s.label, { marginTop: 12 }]}>Payments</Text>

      {/* USD */}
      <View style={s.payRow}>
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>Cash (USD)</Text>
        <Text style={s.subLabel}>Amount (USD)</Text>
        <TextInput
          value={usdAmount}
          onChangeText={onChangeUSD}
          keyboardType="decimal-pad"
          style={s.input}
          placeholder="0.00"
        />
      </View>

      {/* SOS */}
      <View style={s.payRow}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', marginBottom: 6 }}>Cash (SOS)</Text>
          <TouchableOpacity onPress={onRefreshRate} style={[s.tagBtn, { paddingVertical: 6 }]}>
            <Text style={s.tagTxt}>{rateLoading ? 'Rate…' : 'Refresh rate'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.subLabel}>Amount (SOS)</Text>
        <TextInput
          value={sosAmount}
          onChangeText={onChangeSOS}
          keyboardType="number-pad"
          style={s.input}
          placeholder="0"
        />
        <Text style={{ color: '#666', marginTop: 6 }}>
          Using sell rate: <Text style={{ fontWeight: '800' }}>{rate.sell}</Text>  →  USD eq:{' '}
          <Text style={{ fontWeight: '800' }}>
            {(n(sosAmount, 0) / (rate.sell || 27000)).toFixed(2)}
          </Text>
        </Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  label: { fontWeight: '700', marginTop: 6 },
  subLabel: { fontWeight: '600', marginTop: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  payRow: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12, marginTop: 8 },
  tagBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tagTxt: { color: '#fff', fontWeight: '800' },
});