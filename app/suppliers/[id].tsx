// app/suppliers/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, FlatList, TextInput, RefreshControl
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE } from '@/src/config';

/** TEMP auth (move to secure storage) */
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODYzNjc4OSwiZXhwIjoxNzU5MjQxNTg5fQ.t0NJ-WuV9YW4IDt-uDjIAWm-ROOVjJigp-PbCgWxdRU';
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Tx = {
  id: string;
  date: string;          // ISO
  createdAt: string;     // ISO
  reference_type: 'PURCHASE' | 'PAYMENT' | string;
  reference_id: string;
  debit_account?: { id: string; name: string } | null;
  credit_account?: { id: string; name: string } | null;
  amount_usd: number;
  native_amount: number;
  native_currency: string;
  direction: 'DEBIT' | 'CREDIT';          // from API
  signed_amount_usd: number;              // from API (+ up, - down)
};

type Supplier = { id: string; name: string; phone?: string | null; note?: string | null };

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};
const ymd = (iso?: string) => (iso ? iso.slice(0, 10) : '');

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [from, setFrom] = useState<string>('');                 // yyyy-mm-dd (optional)
  const [to, setTo] = useState<string>(ymd(new Date().toISOString()));
  const [runningOn, setRunningOn] = useState(true);

  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const fetchSupplier = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE}/api/suppliers/${id}`, { headers: AUTH });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setSupplier(j?.supplier ?? j?.data ?? j ?? null);
    } catch {
      setSupplier(null);
    }
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setErr('');
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        ...(from ? { date_from: from } : {}),
        ...(to ? { date_to: to } : {}),
        limit: '200',
        offset: '0',
      }).toString();
      const r = await fetch(`${API_BASE}/api/suppliers/${id}/transactions?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j.data || j.rows || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load transactions');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, from, to]);

  useEffect(() => { fetchSupplier(); }, [fetchSupplier]);
  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  /** Label & navigation per row */
  const typeOf = (tx: Tx): 'Purchase' | 'Payment' => {
    // CREDIT increases Payable (we owe more) => Purchase
    // DEBIT decreases Payable (we pay supplier) => Payment
    return tx.direction === 'CREDIT' ? 'Purchase' : 'Payment';
  };

  const openRow = (tx: Tx) => {
    const t = typeOf(tx);
    if (t === 'Purchase') {
      router.push({ pathname: '/purchases/[id]' as const, params: { id: tx.reference_id } });
    } else {
      // Some “paid-at-purchase” rows have reference_type = PURCHASE. If a standalone payment was used,
      // it will be reference_type = PAYMENT and reference_id = payment id; we still open payment here.
      router.push({ pathname: '/payment/[id]' as const, params: { id: tx.reference_id } });
    }
  };

  /** Running balance (sum signed_amount_usd) */
  const rowsWithRunning = useMemo(() => {
    if (!runningOn) return rows.map(r => ({ ...r, _run: undefined as number | undefined }));
    // Compute running from oldest -> newest
    const copy = [...rows].reverse();
    let run = 0;
    const stamped = copy.map(r => {
      run += Number(r.signed_amount_usd || 0);
      return { ...r, _run: run };
    });
    return stamped.reverse();
  }, [rows, runningOn]);

  const renderItem = useCallback(({ item }: { item: Tx & { _run?: number } }) => {
    const tLabel = typeOf(item);
    const isPayment = tLabel === 'Payment';
    const amt = Number(item.signed_amount_usd || 0);
    return (
      <TouchableOpacity onPress={() => openRow(item)} activeOpacity={0.7}>
        <View style={styles.row}>
          <Text style={[styles.colType, styles.bold, isPayment ? styles.typePay : styles.typePurch]} numberOfLines={1}>
            {tLabel}
          </Text>
          <Text style={[styles.colDate]} numberOfLines={1}>{ymd(item.date || item.createdAt)}</Text>
          <Text style={[styles.colAmt, amt < 0 ? styles.red : styles.green]}>
            {money(amt)}
          </Text>
          <Text style={[styles.colRun]}>{item._run != null ? money(item._run) : ''}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: supplier?.name || 'Supplier' }} />

      {/* Filters */}
      <View style={styles.top}>
        <Text style={styles.h1}>{supplier?.name || 'Supplier'}</Text>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>From</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={from}
              onChangeText={setFrom}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>To</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={to}
              onChangeText={setTo}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.pill, styles.pillGrey]} activeOpacity={0.8}>
            <Text style={styles.pillTxt}>type: all</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, runningOn ? styles.pillOn : styles.pillOff]}
            onPress={() => setRunningOn(v => !v)}
          >
            <Text style={[styles.pillTxt, runningOn ? styles.onTxt : styles.offTxt]}>
              running: {runningOn ? 'on' : 'off'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.pill, styles.reload]} onPress={load}>
            <Text style={[styles.pillTxt, { color: '#fff' }]}>Reload</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.thead}>
          <Text style={[styles.th, styles.colType]}>TYPE</Text>
          <Text style={[styles.th, styles.colDate]}>DATE</Text>
          <Text style={[styles.th, styles.colAmt]}>AMOUNT</Text>
          <Text style={[styles.th, styles.colRun]}>RUNNING</Text>
        </View>
      </View>

      {/* Body */}
      {loading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : err && rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: '#b00020' }}>⚠️ {err}</Text>
          <TouchableOpacity onPress={load} style={[styles.reload, { marginTop: 10, borderRadius: 10 }]}>
            <Text style={{ color: '#fff', fontWeight: '800', paddingHorizontal: 14, paddingVertical: 8 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rowsWithRunning}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#777', marginTop: 14 }}>No transactions</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  top: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 8 },

  filterRow: { flexDirection: 'row', marginTop: 2 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  pillGrey: { backgroundColor: '#eee' },
  pillOn: { backgroundColor: '#17a34a22', borderWidth: 1, borderColor: '#16a34a55' },
  pillOff: { backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  onTxt: { color: '#0a7d36', fontWeight: '800' },
  offTxt: { color: '#333', fontWeight: '800' },
  pillTxt: { fontWeight: '800' },
  reload: { backgroundColor: '#000' },

  thead: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ebebeb',
    marginTop: 6,
  },
  th: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },

  row: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },

  bold: { fontWeight: '800' },
  red: { color: '#b00020', fontWeight: '800' },
  green: { color: '#0a7d36', fontWeight: '800' },
  typePurch: { color: '#0a7d36' },
  typePay: { color: '#b00020' },

  // columns
  colType: { flexBasis: '26%', flexGrow: 0, flexShrink: 1 },
  colDate: { flexBasis: '26%', flexGrow: 0, flexShrink: 1 },
  colAmt: { flexBasis: '22%', textAlign: 'right' },
  colRun: { flexBasis: '26%', textAlign: 'right' },
});