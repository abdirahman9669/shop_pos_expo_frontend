// app/journals/[id].tsx
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';



const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

type Data = {
  id: string;
  date: string;
  amount_usd: number;
  native_amount?: number | string | null;
  native_currency?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  debit_account?: { id: string; name: string };
  credit_account?: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  reference?: any | null;
};

export default function JournalDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [row, setRow] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/journals/${id}?expand=ref`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRow(j.data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openReference = () => {
    if (!row?.reference_type || !row?.reference_id) return;
    const id = row.reference_id;
    if (row.reference_type === 'SALE') {
      router.push({ pathname: '/sales/[id]' as const, params: { id } });
    } else if (row.reference_type === 'PURCHASE') {
      router.push({ pathname: '/purchases/[id]' as const, params: { id } });
    } else if (row.reference_type === 'PAYMENT') {
      router.push({ pathname: '/payment/[id]' as const, params: { id } });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Journal' }} />

      {loading ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : err || !row ? (
        <View style={s.center}>
          <Text style={{ color: '#b00020' }}>⚠️ {err || 'Not found'}</Text>
          <TouchableOpacity onPress={load} style={s.btnDark}><Text style={s.btnDarkTxt}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatContent row={row} onReload={load} onOpenRef={openReference} />
      )}
    </SafeAreaView>
  );
}

function FlatContent({ row, onReload, onOpenRef }: { row: Data; onReload: () => void; onOpenRef: () => void }) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={s.h1}>Journal {row.id.slice(0, 8)}</Text>

      <KV k="When" v={(row.date || '').slice(0, 19).replace('T', ' ')} />
      <KV k="Amount (USD)" v={`$${money(row.amount_usd)}`} />
      {row.native_amount ? (
        <KV k="Amount (native)" v={`${money(row.native_amount)} ${row.native_currency || ''}`} />
      ) : null}
      <KV k="Debit → Credit" v={`${row.debit_account?.name || ''} → ${row.credit_account?.name || ''}`} />
      {row.customer ? <KV k="Customer" v={row.customer.name} /> : null}
      {row.supplier ? <KV k="Supplier" v={row.supplier.name} /> : null}
      <KV k="Reference" v={row.reference_type ? `${row.reference_type} ${row.reference_id?.slice(0, 8)}` : '—'} />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        {!!row.reference_type && !!row.reference_id && (
          <TouchableOpacity onPress={onOpenRef} style={s.btnDark}>
            <Text style={s.btnDarkTxt}>Open {row.reference_type}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onReload} style={s.btnLight}>
          <Text style={s.btnLightTxt}>Reload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontWeight: '800', fontSize: 22, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  k: { fontWeight: '700', color: '#666' },
  v: { fontWeight: '800' },

  btnDark: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnDarkTxt: { color: '#fff', fontWeight: '800' },
  btnLight: { backgroundColor: '#eee', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnLightTxt: { fontWeight: '800', color: '#333' },
});