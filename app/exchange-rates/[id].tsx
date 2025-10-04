// app/exchange-rate/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

// ---------- helpers ----------
const fmtSOS = (v: number) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '0';
const fmtNum = (v: number, d = 6) =>
  Number.isFinite(v) ? v.toFixed(d) : '0';
const fmtDT = (s?: string) => {
  if (!s) return '-';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
};

type RateRow = {
  id: string;
  shop_id: string;
  as_of_date: string;
  rate_accounting: string;          // "28000.000000"
  rate_sell_usd_to_sos: string;     // "27000.000000"
  rate_buy_usd_with_sos: string;    // "28000.000000"
  set_by?: string;
  createdAt?: string;
  updatedAt?: string;
  setter?: { id: string; username: string; role?: string };
};

export default function ExchangeRateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [row, setRow] = useState<RateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      // try a direct-by-id endpoint first; if your API only supports list+filter, we’ll filter client-side
      const r = await fetch(`${API_BASE}/api/exchange-rates?limit=50&offset=0`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);

      const list: RateRow[] = j?.data ?? [];
      const item = list.find((x) => x.id === id) || null;
      if (!item) throw new Error('Exchange rate not found');
      setRow(item);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const numeric = useMemo(() => {
    if (!row) return null;
    const acct = Number(row.rate_accounting || 0);
    const sell = Number(row.rate_sell_usd_to_sos || 0);
    const buy  = Number(row.rate_buy_usd_with_sos || 0);
    const spreadAbs = (sell && buy) ? Math.abs(sell - buy) : 0;
    const spreadPct = (acct > 0 && spreadAbs > 0) ? (spreadAbs / acct) * 100 : 0;
    return { acct, sell, buy, spreadAbs, spreadPct };
  }, [row]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Exchange Rate' }} />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : err ? (
        <View style={s.center}>
          <Text style={{ color: '#b00020', marginBottom: 10 }}>⚠️ {err}</Text>
          <TouchableOpacity style={s.btn} onPress={load}>
            <Text style={s.btnTxt}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : !row ? (
        <View style={s.center}>
          <Text>Not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.h1}>Rate Details</Text>

          <View style={s.card}>
            <Text style={s.cardTitle}>Core</Text>

            <KV k="Rate ID" v={row.id} />
            <KV k="As of" v={fmtDT(row.as_of_date)} />

            <Divider />

            <KV k="Accounting rate (SOS / USD)" v={fmtSOS(numeric?.acct ?? 0)} />
            <KV k="Sell: USD → SOS" v={`${fmtSOS(numeric?.sell ?? 0)}  SOS per $1`} />
            <KV k="Buy: SOS → USD"  v={`${fmtSOS(numeric?.buy ?? 0)}  SOS per $1`} />

            <Divider />

            <KV k="Spread (abs)" v={`${fmtSOS(numeric?.spreadAbs ?? 0)} SOS`} />
            <KV k="Spread (% vs accounting)" v={`${fmtNum(numeric?.spreadPct ?? 0, 4)} %`} />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Audit</Text>
            <KV k="Set by" v={row.setter?.username ? `${row.setter.username} (${row.setter.role || '—'})` : (row.set_by || '—')} />
            <KV k="Created" v={fmtDT(row.createdAt)} />
            <KV k="Updated" v={fmtDT(row.updatedAt)} />
          </View>

          <TouchableOpacity style={[s.btn, { marginTop: 12 }]} onPress={load}>
            <Text style={s.btnTxt}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={{ height: 10 }} />;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.kv}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: '#f7f7f7', borderRadius: 12, padding: 12, marginBottom: 14 },
  cardTitle: { fontWeight: '800', marginBottom: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { color: '#666', fontWeight: '700' },
  v: { fontWeight: '800', textAlign: 'right', flexShrink: 1, marginLeft: 12 },
  btn: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnTxt: { color: '#fff', fontWeight: '800' },
});