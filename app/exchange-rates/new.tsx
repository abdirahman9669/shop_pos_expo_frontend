// app/exchange-rates/new.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/** —— TEMP auth (move to secure storage) —— */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

const num = (s: string) => {
  const x = Number.parseFloat((s || '').replace(',', '.'));
  return Number.isFinite(x) ? x : NaN;
};

export default function NewExchangeRate() {
  const router = useRouter();

  const [asOf, setAsOf] = useState(''); // optional; e.g. 2025-09-26 12:00
  const [acc, setAcc] = useState('27000');
  const [sell, setSell] = useState('27000');
  const [buy, setBuy] = useState('28000');
  const [busy, setBusy] = useState(false);

  const canSave = useMemo(() => {
    const a = num(acc), s = num(sell), b = num(buy);
    return Number.isFinite(a) && a > 0 && Number.isFinite(s) && s > 0 && Number.isFinite(b) && b > 0;
  }, [acc, sell, buy]);

  const submit = useCallback(async () => {
    if (!canSave) { Alert.alert('Missing/invalid values', 'Enter positive numbers'); return; }
    setBusy(true);
    try {
      const body: any = {
        rate_accounting: num(acc),
        rate_sell_usd_to_sos: num(sell),
        rate_buy_usd_with_sos: num(buy),
      };
      if (asOf.trim()) body.as_of_date = asOf.trim(); // backend accepts ISO or date-only

      const r = await fetch(`${API_BASE}/api/exchange-rates`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      Alert.alert('✅ Saved', 'Exchange rate added', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Create rate failed', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, [asOf, acc, sell, buy, canSave, router]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New Rate' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ padding: 16, gap: 14 }}>
          <Text style={s.label}>As of (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="YYYY-MM-DD or full ISO"
            value={asOf}
            onChangeText={setAsOf}
            autoCapitalize="none"
          />

          <Text style={s.label}>Accounting rate (SOS per 1 USD)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={acc}
            onChangeText={setAcc}
            placeholder="27000"
          />

          <Text style={s.label}>Sell USD → SOS (SOS per 1 USD)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={sell}
            onChangeText={setSell}
            placeholder="27000"
          />

          <Text style={s.label}>Buy USD ⇐ SOS (SOS per 1 USD)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={buy}
            onChangeText={setBuy}
            placeholder="28000"
          />

          <TouchableOpacity
            onPress={submit}
            disabled={!canSave || busy}
            style={[s.submit, (!canSave || busy) && { opacity: 0.5 }]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Create rate</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  label: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  submit: { marginTop: 6, backgroundColor: '#000', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  submitTxt: { color: '#fff', fontWeight: '800' },
});