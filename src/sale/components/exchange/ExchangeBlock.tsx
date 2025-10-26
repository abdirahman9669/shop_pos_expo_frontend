import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Rate } from '../../lib/types';
import { money } from '../../lib/math';
import { buildExchangePreviewText } from './useExchangePreview';

export default function ExchangeBlock(props: {
  extraUsd: number;
  dualTenderOverpay: boolean;
  hasUSD: boolean;
  hasSOS: boolean;
  rate: Rate;

  dir: 'USD2SOS' | 'SOS2USD'; // NEW
  uiRate: number;             // NEW
  exRoundMode: 'auto'|'up'|'down'; // NEW
  onToggleRound: () => void;       // NEW
  exRawNative: number;             // NEW (raw SOS when USD→SOS)
  exChosenNative: number;          // NEW (rounded SOS)
  exDiffNative: number;            // NEW

  
  totalUsd: number;
  paidUsdEq: number;
  exchangeAccepted: boolean;
  onAccept: () => void;
}) {
  const {
    extraUsd, dualTenderOverpay, hasUSD, hasSOS, rate,
    dir, uiRate, exRoundMode, onToggleRound,
    exRawNative, exChosenNative, exDiffNative,
    totalUsd, paidUsdEq, exchangeAccepted, onAccept
  } = props;

  if (extraUsd <= 0) return null;
  if (dualTenderOverpay) {
    return (
      <View style={sx.exBox}>
        <Text style={sx.exTitle}>Extra detected: ${money(extraUsd)}</Text>
        <Text style={sx.exP}>Exchange isn’t available when both USD and SOS are provided.</Text>
        <Text style={sx.exHint}>Reduce one of the payments so total equals the sale amount.</Text>
      </View>
    );
  }

  // existing preview text (keep your buildExchangePreviewText if you like)
  const humanDir = dir === 'USD2SOS' ? 'USD → SOS' : 'SOS → USD';

  return (
    <View style={sx.exBox}>
      <Text style={sx.exTitle}>Extra detected: ${money(extraUsd)}</Text>

      <Text style={sx.exP}>
        Direction: <Text style={{fontWeight:'800'}}>{humanDir}</Text>  •  Rate: {uiRate}
      </Text>

      {dir === 'USD2SOS' ? (
        <View style={{ marginTop: 6 }}>
          <Text style={sx.exP}>Customer will receive (SOS):</Text>
          <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
            <TouchableOpacity onPress={onToggleRound}
              style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f1f1f1' }}>
              <Text>
                {exChosenNative.toLocaleString()}
                {'  '}
                <Text style={{ color:'#666', fontSize:12 }}>
                  ({exRoundMode === 'auto' ? 'auto' : exRoundMode})
                </Text>
              </Text>
            </TouchableOpacity>
            <Text style={{ marginLeft: 8, color:'#666' }}>raw {exRawNative.toLocaleString()}</Text>
            {exDiffNative !== 0 && (
            <Text style={{ marginLeft: 8, color: exDiffNative > 0 ? '#c1121f' : '#0a7d36' }}>
            {exDiffNative > 0 ? `+${exDiffNative.toLocaleString()} R loss` : `${exDiffNative.toLocaleString()} R gain`}
            </Text>
            )}
          </View>
          <Text style={[sx.exHint, { marginTop: 6 }]}>
            Tap the gray chip to toggle rounding (up / down / auto).
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onAccept}
        disabled={exchangeAccepted}
        style={[sx.exBtn, exchangeAccepted && { opacity: 0.6 }]}
      >
        <Text style={sx.exBtnTxt}>
          {exchangeAccepted ? 'Exchange accepted' : 'Accept exchange'}
        </Text>
      </TouchableOpacity>

      <Text style={sx.exHint}>We’ll record the change via Exchange and post the sale exact.</Text>
    </View>
  );
}

const sx = StyleSheet.create({
  exBox: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ddd', padding: 12, marginTop: 12 },
  exTitle: { fontWeight: '800', fontSize: 16 },
  exP: { marginTop: 6, color: '#333', fontWeight: '600' },
  exHint: { marginTop: 6, color: '#888' },
  exBtn: { marginTop: 10, backgroundColor: '#000', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  exBtnTxt: { color: '#fff', fontWeight: '800' },
});
