// app/payments/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/** ====== TEMP AUTH (move to secure storage later) ====== */

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ====== Types ====== */
type Payment = {
  id: string;
  createdAt: string;
  direction: 'IN' | 'OUT';
  method: string;
  currency: 'USD' | 'SOS';
  amount_usd: number;
  customer_id?: string | null;
  supplier_id?: string | null;
  sale_id?: string | null;
  purchase_id?: string | null;
  Customer?: { id: string; name: string; phone?: string | null } | null;
  Supplier?: { id: string; name: string; phone?: string | null } | null;
  Sale?: { id: string; native_currency: string; total_usd: number } | null;
};

/** ====== Helpers ====== */
const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** ====== Screen ====== */
export default function PaymentsIndex() {
  const router = useRouter();

  // Filters
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const [dateFrom, setDateFrom] = useState(ymd(jan1));
  const [dateTo, setDateTo] = useState(ymd(today));
  const [qMin, setQMin] = useState('');
  const [qMax, setQMax] = useState('');
  const [dirFilter, setDirFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Data
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const totalUsd = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount_usd || 0), 0),
    [rows]
  );

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        ...(dirFilter !== 'ALL' ? { direction: dirFilter } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ...(qMin ? { min_usd: qMin } : {}),
        ...(qMax ? { max_usd: qMax } : {}),
        order: 'createdAt',
        dir: 'DESC',
        limit: '100',
      }).toString();

      const r = await fetch(`${API_BASE}/api/payments?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j.data || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load payments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dirFilter, dateFrom, dateTo, qMin, qMax]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  useEffect(() => { load(); }, [load]);

  /** —— Type-safe navigators (no generic "go") —— */
  const openPayment = (id: string) =>
    router.push({ pathname: '/payment/[id]' as const, params: { id } });

  const openCustomer = (id: string) =>
    router.push({ pathname: '/customer/[id]' as const, params: { id } });
/*
  const openSupplier = (id: string) =>
    router.push({ pathname: '/supplier/[id]' as const, params: { id } });
*/
  const openSale = (id: string) =>
    router.push({ pathname: '/sales/[id]' as const, params: { id } });

  const openPurchase = (id: string) =>
    router.push({ pathname: '/purchases/[id]' as const, params: { id } });

  const createPayment = () =>
    router.push({ pathname: '/payments/new' as const });

  /** —— Row rendering —— */
  const RowItem = ({ item }: { item: Payment }) => {
    const party =
      item.Customer?.name ??
      item.Supplier?.name ??
      '(no party)';

    const context =
      item.sale_id ? `Sale ${item.sale_id.slice(0, 8)}`
      : item.purchase_id ? `Purchase ${item.purchase_id.slice(0, 8)}`
      : '';

    return (
      <TouchableOpacity onPress={() => openPayment(item.id)} activeOpacity={0.7}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.titleRow}>
              {item.direction} • {item.method} • {item.currency}
            </Text>
            <Text style={s.subRow} numberOfLines={1}>
              {item.createdAt.slice(0, 19).replace('T', ' ')} • {party}{context ? ` • ${context}` : ''}
            </Text>
          </View>
          <Text style={s.amount}>{money(item.amount_usd)}</Text>
        </View>

        {/* Quick chips for related links */}
        <View style={s.chips}>
          {item.Customer?.id ? (
            <TouchableOpacity style={s.chip} onPress={() => openCustomer(item.Customer!.id!)}>
              <Text style={s.chipText}>Customer</Text>
            </TouchableOpacity>
          ) : null}
{
    /*


          {item.Supplier?.id ? (
            <TouchableOpacity style={s.chip} onPress={() => openSupplier(item.Supplier!.id!)}>
              <Text style={s.chipText}>Supplier</Text>
            </TouchableOpacity>
          ) : null}

    */
}
          {item.sale_id ? (
            <TouchableOpacity style={s.chip} onPress={() => openSale(item.sale_id!)}>
              <Text style={s.chipText}>Sale</Text>
            </TouchableOpacity>
          ) : null}
          {item.purchase_id ? (
            <TouchableOpacity style={s.chip} onPress={() => openPurchase(item.purchase_id!)}>
              <Text style={s.chipText}>Purchase</Text>
            </TouchableOpacity>
          ) : null}

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Payments' }} />

      {/* Filters */}
      <View style={s.wrap}>
        <View style={s.filtersRow}>
          <TouchableOpacity
            onPress={() =>
              setDirFilter(v => (v === 'ALL' ? 'IN' : v === 'IN' ? 'OUT' : 'ALL'))
            }
            style={s.toggle}
          >
            <Text style={s.toggleText}>Direction: {dirFilter}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={createPayment} style={s.newBtn}>
            <Text style={s.newBtnText}>+ New Payment</Text>
          </TouchableOpacity>
        </View>

        <View style={s.filtersRow}>
          <View style={s.col}>
            <Text style={s.label}>From</Text>
            <TextInput
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={s.input}
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={s.col}>
            <Text style={s.label}>To</Text>
            <TextInput
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={s.input}
            />
          </View>
        </View>

        <View style={s.filtersRow}>
          <View style={s.col}>
            <Text style={s.label}>Min (USD)</Text>
            <TextInput
              value={qMin}
              onChangeText={setQMin}
              placeholder="0"
              keyboardType="decimal-pad"
              style={s.input}
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={s.col}>
            <Text style={s.label}>Max (USD)</Text>
            <TextInput
              value={qMax}
              onChangeText={setQMax}
              placeholder="100"
              keyboardType="decimal-pad"
              style={s.input}
            />
          </View>
          <View style={{ width: 10 }} />
          <TouchableOpacity onPress={load} style={s.reloadBtn} disabled={loading}>
            <Text style={s.reloadText}>{loading ? 'Loading…' : 'Load'}</Text>
          </TouchableOpacity>
        </View>

        {err ? (
          <TouchableOpacity onPress={load} style={s.errorBox}>
            <Text style={s.errorText}>⚠️ {err}</Text>
            <Text style={{ color: '#333', marginTop: 4 }}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading payments…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          refreshing={refreshing}
          onRefresh={refresh}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => <RowItem item={item} />}
          ListFooterComponent={
            rows.length ? (
              <View style={s.footer}>
                <Text style={s.totalText}>Total USD: {money(totalUsd)}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={s.empty}>No payments found for this filter.</Text>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

/** ====== Styles ====== */
const s = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  filtersRow: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  toggle: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  toggleText: { color: 'white', fontWeight: '800' },

  newBtn: { marginLeft: 'auto', backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  newBtnText: { color: 'white', fontWeight: '800' },

  reloadBtn: { backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  reloadText: { color: 'white', fontWeight: '800' },

  errorBox: { backgroundColor: '#fdecea', borderRadius: 10, padding: 12, marginTop: 8 },
  errorText: { color: '#b3261e', fontWeight: '700' },

  sep: { height: 8, backgroundColor: '#fafafa' },

  row: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  titleRow: { fontWeight: '700' },
  subRow: { color: '#666', marginTop: 2 },
  amount: { marginLeft: 8, fontWeight: '800' },

  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: 'white' },
  chip: { backgroundColor: '#efefef', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontWeight: '700', color: '#333' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  totalText: { fontWeight: '800', fontSize: 16 },
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
});