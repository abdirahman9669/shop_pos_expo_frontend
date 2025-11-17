// app/cash-sessions/[id].tsx
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';

async function authHeaders() {
  const auth = await loadAuth();         // { token, user, shop, ... } or null      
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Session = {
  id: string;
  device_id: string;
  opened_at: string;
  opening_cash_usd?: number | string | null;
  opening_cash_sos?: number | string | null;
  closed_at: string | null;
  closing_cash_usd?: number | string | null;
  closing_cash_sos?: number | string | null;
};

const fmtDate = (s?: string | null) => (s ? s.slice(0, 19).replace('T', ' ') : '');

// safe number helpers (API may return strings like "10.0000")
const num = (v: unknown) => {
  const n = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const money = (v: unknown) => num(v).toFixed(2);

export default function CashSessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [row, setRow] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [usd, setUsd] = useState('0');
  const [sos, setSos] = useState('0');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      // Your backend lacks GET /:id; fetch and find locally
      const r = await fetch(`${API_BASE}/api/cash-sessions`, { headers: await authHeaders() });
      const j = await r.json();
      const arr: Session[] = Array.isArray(j) ? j : (j?.data ?? j ?? []);
      const found = arr.find((s) => s.id === id);
      if (!found) throw new Error('Session not found');

      setRow(found);
      // prefill closing fields with closing (if any) else opening
      setUsd(String(found.closing_cash_usd ?? found.opening_cash_usd ?? '0'));
      setSos(String(found.closing_cash_sos ?? found.opening_cash_sos ?? '0'));
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const closeIt = useCallback(async () => {
    if (!row || row.closed_at) return;
    setBusy(true);
    try {
      const body = {
        closing_cash_usd: num(usd),
        closing_cash_sos: num(sos),
      };
      const r = await fetch(`${API_BASE}/api/cash-sessions/${id}/close`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      Alert.alert('✅ Session closed');
      router.back();
    } catch (e: any) {
      Alert.alert('Close failed', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, [row, id, usd, sos, router]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `Session ${String(id).slice(0, 8)}` }} />
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : err ? (
        <View style={s.center}>
          <Text style={{ color: '#b00020' }}>⚠️ {err}</Text>
        </View>
      ) : row ? (
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={s.title}>Cash Session</Text>

          <View style={s.kv}>
            <Text style={s.k}>Device</Text>
            <Text style={s.v}>{row.device_id?.slice(0, 8)}</Text>
          </View>

          <View style={s.kv}>
            <Text style={s.k}>Opened</Text>
            <Text style={s.v}>{fmtDate(row.opened_at)}</Text>
          </View>

          <View style={s.kv}>
            <Text style={s.k}>Opening USD / SOS</Text>
            <Text style={s.v}>
              {money(row.opening_cash_usd)} / {num(row.opening_cash_sos)}
            </Text>
          </View>

          {row.closed_at ? (
            <>
              <View style={s.kv}>
                <Text style={s.k}>Closed</Text>
                <Text style={s.v}>{fmtDate(row.closed_at)}</Text>
              </View>
              <View style={s.kv}>
                <Text style={s.k}>Closing USD / SOS</Text>
                <Text style={s.v}>
                  {money(row.closing_cash_usd)} / {num(row.closing_cash_sos)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={s.label}>Closing cash USD</Text>
              <TextInput value={usd} onChangeText={setUsd} keyboardType="decimal-pad" style={s.input} />
              <Text style={s.label}>Closing cash SOS</Text>
              <TextInput value={sos} onChangeText={setSos} keyboardType="decimal-pad" style={s.input} />

              <TouchableOpacity onPress={closeIt} disabled={busy} style={[s.submit, busy && { opacity: 0.6 }]}>
                <Text style={s.submitTxt}>{busy ? 'Saving…' : 'Close Session'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', fontSize: 20, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  k: { fontWeight: '700', color: '#666' },
  v: { fontWeight: '700' },
  label: { fontWeight: '700', marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  submit: { backgroundColor: '#000', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitTxt: { color: '#fff', fontWeight: '800' },
});