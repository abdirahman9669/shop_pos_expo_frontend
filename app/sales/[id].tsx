// app/sales/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE, TOKEN } from '@/src/config';

/** ---- TEMP AUTH (replace with your secure storage later) ---- */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ---- Types ---- */
type SaleLine = {
  id: string;
  qty: string | number;
  unit_price_usd: string | number;
  subtotal_usd: string | number;
  Product?: { id: string; name?: string | null; sku?: string | null } | null;
};

type PaymentRow = {
  id: string;
  direction: 'IN' | 'OUT';
  method: string;
  currency: 'USD' | 'SOS';
  amount_usd: number | string;
  amount_native?: number | string | null;
  createdAt: string;
};

type SaleDetail = {
  id: string;
  status: string;
  total_usd: string | number;
  native_currency: 'USD' | 'SOS';
  createdAt: string;
  SaleLines?: SaleLine[];
};

type ApiResp = {
  ok: boolean;
  sale: SaleDetail;
  payments: PaymentRow[];
};

/** ---- Utils ---- */
const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};
const fmtDate = (iso: string) => (iso ? iso.slice(0, 19).replace('T', ' ') : '');

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${API_BASE}/api/sales/${id}`, { headers: AUTH });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setSale(j.sale);
      setPayments(j.payments || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setSale(null); setPayments([]);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const lines = useMemo(() => sale?.SaleLines ?? [], [sale]);

  // ---- Totals (like purchase screen) ----
  const totalUsd = useMemo(() => Number(sale?.total_usd || 0), [sale]);
  const paidUsd = useMemo(
    () => payments
      .filter(p => p.direction === 'IN')
      .reduce((s, p) => s + Number(p.amount_usd || 0), 0),
    [payments]
  );
  const balanceUsd = useMemo(() => Math.max(0, totalUsd - paidUsd), [totalUsd, paidUsd]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: sale ? `Sale ${sale.id.slice(0, 8)}` : 'Sale' }} />

      {loading ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : err ? (
        <View style={s.center}><Text style={{ color: '#b00020' }}>⚠️ {err}</Text></View>
      ) : !sale ? (
        <View style={s.center}><Text>Not found</Text></View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          ListHeaderComponent={
            <View style={{ gap: 8 }}>
              <Text style={s.h1}>Sale {sale.id.slice(0, 8)}</Text>
              <Row k="Status" v={sale.status} />
              <Row k="When" v={fmtDate(sale.createdAt)} />
              <Row k="Total (USD)" v={money(sale.total_usd)} />
              <Row k="Currency" v={sale.native_currency} />

              <Text style={s.h2}>Lines</Text>
              <HeaderRow />
              {lines.length === 0 && (
                <Text style={{ color: '#777', marginTop: 6 }}>No lines.</Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const name =
              item.Product?.name ??
              item.Product?.sku ??
              item.Product?.id ??
              '—';
            const qty = Number(item.qty || 0);
            const price = money(item.unit_price_usd);
            const total = money(item.subtotal_usd);
            return (
              <View style={s.lineRow}>
                <Text style={[s.cell, s.cName]} numberOfLines={1}>{name}</Text>
                <Text style={[s.cell, s.cQty]}>{qty}</Text>
                <Text style={[s.cell, s.cPrice]}>{price}</Text>
                <Text style={[s.cell, s.cTotal]}>{total}</Text>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={{ marginTop: 18, gap: 12 }}>
              {/* Payments list */}
              <Text style={s.h2}>Payments</Text>
              {payments.length === 0 ? (
                <Text style={{ color: '#777' }}>No payments recorded for this sale.</Text>
              ) : (
                payments.map(p => (
                  <View key={p.id} style={s.payRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pTitle} numberOfLines={1}>
                        {p.direction} • {p.method} • {p.currency}
                      </Text>
                      <Text style={s.pSub}>{fmtDate(p.createdAt)}</Text>
                    </View>
                    <Text style={s.pAmt}>{money(p.amount_usd)}</Text>
                  </View>
                ))
              )}

              {/* Totals summary (bottom) */}
              <View style={s.totalsCard}>
                <KV label="Total (USD)" value={money(totalUsd)} bold />
                <KV label="Paid (USD)" value={money(paidUsd)} />
                <View style={s.sep} />
                <KV label="Balance (USD)" value={money(balanceUsd)} bold />
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/** ---- Small components & styles ---- */
function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.kv}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
  );
}

function HeaderRow() {
  return (
    <View style={s.hdr}>
      <Text style={[s.hc, s.cName]}>NAME</Text>
      <Text style={[s.hc, s.cQty]}>QTY</Text>
      <Text style={[s.hc, s.cPrice]}>PRICE</Text>
      <Text style={[s.hc, s.cTotal]}>TOTAL</Text>
    </View>
  );
}

function KV({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.kv2}>
      <Text style={[s.k2]}>{label}</Text>
      <Text style={[s.v2, bold && { fontWeight: '900' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  h1: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  h2: { fontSize: 16, fontWeight: '800', marginTop: 14, marginBottom: 8 },

  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { color: '#666', fontWeight: '700' },
  v: { fontWeight: '800' },

  hdr: {
    flexDirection: 'row',
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  hc: { fontWeight: '800', color: '#333' },

  lineRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  cell: { paddingHorizontal: 4, fontWeight: '700' },
  cName: { flex: 1, minWidth: 120 },
  cQty: { width: 56, textAlign: 'right' },
  cPrice: { width: 80, textAlign: 'right' },
  cTotal: { width: 84, textAlign: 'right' },

  // payments
  payRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pTitle: { fontWeight: '700' },
  pSub: { color: '#666', fontSize: 12, marginTop: 2 },
  pAmt: { width: 100, textAlign: 'right', fontWeight: '900', alignSelf: 'center' },

  // totals card
  totalsCard: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  kv2: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k2: { color: '#444', fontWeight: '700' },
  v2: { fontWeight: '800' },
  sep: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
});