// app/purchases/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE, TOKEN } from '@/src/config';

/** ===== TEMP AUTH (move to secure storage later) ===== */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ===== Types (matches your /api/purchases/:id) ===== */
type Line = {
  id: string;
  product: { id: string; sku?: string; name: string; unit?: string } | null;
  qty: number;
  unit_cost_usd: number;
  subtotal_usd: number;
  createdAt: string;
};

type PaymentsBlock = {
  total_cost_usd: number;
  paid_usd: number;
  payable_usd_remaining: number;
  cash_payments: {
    id: string;
    date: string;
    amount_usd: number;
    native_amount: number | null;
    native_currency: string | null;
    debit_account: string | null;
    credit_account: string | null;
    createdAt: string;
  }[];
  on_credit: {
    id: string;
    date: string;
    amount_usd: number;
    native_amount: number | null;
    native_currency: string | null;
    debit_account: string | null;
    credit_account: string | null;
    createdAt: string;
  }[];
  journal_entries_count: number;
};

type PurchaseDetail = {
  ok: boolean;
  purchase: {
    id: string;
    shop_id: string;
    purchase_number?: string | null;
    status: 'RECEIVED' | 'VOIDED' | string;
    total_cost_usd: number | string;
    created_by: string;
    createdAt: string;
    updatedAt: string;
    store: { id: string; name: string } | null;
    supplier: { id: string; name: string; phone?: string | null; note?: string | null } | null;
  };
  lines: Line[];
  payments: PaymentsBlock;
};

const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setErr(''); setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/purchases/${id}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setData(null);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const title = useMemo(
    () => (id ? `Purchase ${String(id).slice(0, 8)}` : 'Purchase'),
    [id]
  );

  const onVoid = useCallback(async () => {
    if (!data || data.purchase.status === 'VOIDED') return;
    Alert.alert('Void purchase?', 'This will reverse stock movements and journals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await fetch(`${API_BASE}/api/purchases/${id}/void`, {
              method: 'POST',
              headers: AUTH,
            });
            const j = await r.json();
            if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
            Alert.alert('Voided', 'Purchase has been voided.');
            load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to void');
          }
        },
      },
    ]);
  }, [data, id, load]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title }} />
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : !data ? (
        <View style={s.center}>
          <Text style={{ color: '#b00020' }}>⚠️ {err || 'Not found'}</Text>
          <TouchableOpacity onPress={load} style={[s.btn, { marginTop: 10 }]}>
            <Text style={s.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data.lines}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={
            <View style={{ padding: 16, gap: 10 }}>
              <Text style={s.h1}>{data.purchase.supplier?.name || '(No supplier)'}</Text>

              <View style={s.kv}><Text style={s.k}>Status</Text><Text style={[s.v, data.purchase.status === 'VOIDED' && { color: '#b00020' }]}>{data.purchase.status}</Text></View>
              <View style={s.kv}><Text style={s.k}>Store</Text><Text style={s.v}>{data.purchase.store?.name || '-'}</Text></View>
              <View style={s.kv}><Text style={s.k}>Created</Text><Text style={s.v}>{data.purchase.createdAt.slice(0,19).replace('T',' ')}</Text></View>
              <View style={s.kv}><Text style={s.k}>Total (USD)</Text><Text style={s.v}>{money(data.payments.total_cost_usd)}</Text></View>
              <View style={s.kv}><Text style={s.k}>Paid (USD)</Text><Text style={s.v}>{money(data.payments.paid_usd)}</Text></View>
              <View style={s.kv}><Text style={s.k}>Payable (USD)</Text><Text style={s.v}>{money(data.payments.payable_usd_remaining)}</Text></View>
             <View style={s.kv}><Text style={s.k}>purchase number</Text><Text style={s.v}>{data.purchase.purchase_number || '-'}</Text></View>
            
              <View style={s.actions}>
                <TouchableOpacity style={s.btn} onPress={load}>
                  <Text style={s.btnText}>Reload</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnLight, data.purchase.status === 'VOIDED' && { opacity: 0.5 }]}
                  onPress={onVoid}
                  disabled={data.purchase.status === 'VOIDED'}
                >
                  <Text style={[s.btnText, { color: '#000' }]}>Void</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.btnOutline}
                  onPress={() => router.push({ pathname: '/payments/new' as const, params: { dir: 'OUT', supplier_id: data.purchase.supplier?.id || '' } })}
                >
                  <Text style={[s.btnText, { color: '#000' }]}>Add Payment</Text>
                </TouchableOpacity>
              </View>

              {/* Lines header */}
              <Text style={[s.h2, { marginTop: 4 }]}>Lines</Text>
              <View style={[s.row, s.headerRow]}>
                <Text style={[s.cell, s.colSku, s.headerText]}>sku</Text>
                <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
                <Text style={[s.cell, s.colUnit, s.headerText]}>unit</Text>
                <Text style={[s.cell, s.colQty, s.headerText, s.right]}>qty</Text>
                <Text style={[s.cell, s.colCost, s.headerText, s.right]}>cost</Text>
                <Text style={[s.cell, s.colSub, s.headerText, s.right]}>subtotal</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.row, s.dataRow]}>
              <Text style={[s.cell, s.colSku]} numberOfLines={1}>{item.product?.sku || ''}</Text>
              <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.product?.name || '(unknown)'}</Text>
              <Text style={[s.cell, s.colUnit]} numberOfLines={1}>{item.product?.unit || ''}</Text>
              <Text style={[s.cell, s.colQty, s.right]}>{item.qty}</Text>
              <Text style={[s.cell, s.colCost, s.right]}>{money(item.unit_cost_usd)}</Text>
              <Text style={[s.cell, s.colSub, s.right]}>{money(item.subtotal_usd)}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListFooterComponent={
            <View style={{ padding: 16, gap: 12 }}>
              {/* Payments */}
              <Text style={s.h2}>Payments</Text>

              {/* Cash payments */}
              {data.payments.cash_payments.length ? (
                <>
                  <Text style={s.sectionLabel}>Cash/Immediate</Text>
                  {data.payments.cash_payments.map((p) => (
                    <View key={p.id} style={[s.rowMini, s.cardRow]}>
                      <Text style={[s.small, { flex: 1 }]} numberOfLines={1}>
                        {p.createdAt.slice(0,19).replace('T',' ')}
                      </Text>
                      <Text style={[s.small, { flexBasis: 110, textAlign: 'right' }]}>
                        USD {money(p.amount_usd)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              {/* On credit (Payable) */}
              {data.payments.on_credit.length ? (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 8 }]}>On Credit</Text>
                  {data.payments.on_credit.map((p) => (
                    <View key={p.id} style={[s.rowMini, s.cardRow]}>
                      <Text style={[s.small, { flex: 1 }]} numberOfLines={1}>
                        {p.createdAt.slice(0,19).replace('T',' ')} • {p.credit_account}
                      </Text>
                      <Text style={[s.small, { flexBasis: 110, textAlign: 'right' }]}>
                        USD {money(p.amount_usd)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              {/* Totals */}
              <View style={s.totalsBox}>
                <Text style={s.totalLine}>Total: USD {money(data.payments.total_cost_usd)}</Text>
                <Text style={s.totalLine}>Paid: USD {money(data.payments.paid_usd)}</Text>
                <Text style={s.totalLine}>Remaining: USD {money(data.payments.payable_usd_remaining)}</Text>
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

/** ===== Styles ===== */
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  h1: { fontWeight: '800', fontSize: 20 },
  h2: { fontWeight: '800', fontSize: 16 },

  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  k: { color: '#666', fontWeight: '700' },
  v: { fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnLight: { backgroundColor: '#eee', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnOutline: { borderWidth: 1, borderColor: '#aaa', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },

  // table
  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colSku: { flexBasis: '18%', flexGrow: 0, flexShrink: 1 },
  colName: { flexBasis: '36%', flexGrow: 1, flexShrink: 1 },
  colUnit: { flexBasis: '10%', flexGrow: 0, flexShrink: 1 },
  colQty: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colCost: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colSub: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  right: { textAlign: 'right' },

  // payments list
  sectionLabel: { fontWeight: '800', color: '#333' },
  rowMini: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardRow: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#eee' },
  small: { fontSize: 12, fontWeight: '700', color: '#333' },

  totalsBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, alignItems: 'flex-end' },
  totalLine: { fontWeight: '800' },
});