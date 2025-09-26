import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE } from '@/src/config';

/** ---- TEMP auth (same style as other pages) ---- */
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODYzNjc4OSwiZXhwIjoxNzU5MjQxNTg5fQ.t0NJ-WuV9YW4IDt-uDjIAWm-ROOVjJigp-PbCgWxdRU';
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ---- Types ---- */
type PurchaseRow = {
  id: string;
  supplier_id: string;
  total_cost_usd: string | number;
  status: string;
  createdAt: string;
  Store?: { id: string; name: string } | null;
  Supplier?: { id: string; name: string } | null;
};

/** ---- Utils ---- */
const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};
const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

/** ---- Screen ---- */
export default function PurchasesIndex() {
  const router = useRouter();

  // filters / ui
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(''); // YYYY-MM-DD
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // paging
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);

  const LIM = 30;

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    u.set('limit', String(LIM));
    u.set('offset', String(offset));
    u.set('order', 'createdAt');
    u.set('dir', 'DESC');
    if (q.trim()) u.set('q', q.trim());
    // backend may ignore these; we’ll still send them
    if (from) u.set('date_from', from);
    if (to) u.set('date_to', to);
    return u.toString();
  }, [q, from, to, offset]);

  const load = useCallback(async (mode: 'reset' | 'more' = 'reset') => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/purchases?${qs}`, { headers: AUTH });
      const j = await r.json();

      // Expect shape: { ok, data, total, ... }
      const list: PurchaseRow[] = (j?.data ?? j ?? []) as any[];
      const t = Number(j?.total ?? (Array.isArray(list) ? list.length : 0));

      if (mode === 'reset') {
        setRows(list);
      } else {
        setRows(prev => [...prev, ...list]);
      }
      setTotal(t);
      setDone((mode === 'reset' ? list.length : rows.length + list.length) >= t || list.length < LIM);

      // If server ignored date_from/date_to, we can client-filter by createdAt
      if (from || to) {
        const f = from ? new Date(from + 'T00:00:00') : null;
        // if user typed YYYY-MM-DD, include the whole day for "to"
        const tEnd = to ? new Date(to + 'T23:59:59.999') : null;
        const filtered = (mode === 'reset' ? list : [...rows, ...list]).filter(rw => {
          const d = new Date(rw.createdAt);
          if (f && d < f) return false;
          if (tEnd && d > tEnd) return false;
          return true;
        });
        setRows(filtered);
        setDone(true); // we have all client-side
      }
    } catch (e) {
      // swallow; show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [qs, loading, from, to, rows]);

  useEffect(() => { load('reset'); }, [qs]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    setDone(false);
    load('reset');
  }, [load]);

  const applyFilters = useCallback(() => {
    setOffset(0);
    setDone(false);
    load('reset');
  }, [load]);

  const loadMore = useCallback(() => {
    if (loading || done) return;
    setOffset(prev => prev + LIM);
  }, [loading, done]);

  const openNew = () => router.push('/purchase-new' as any);
  const openDetail = (id: string) => router.push(`/purchases/${id}` as any);

  // default dates helper (e.g., last 30d)
  useEffect(() => {
    if (!from && !to) {
      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setFrom(toIsoDate(past));
      setTo(toIsoDate(today));
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Purchases' }} />

      {/* Filters */}
      <View style={s.filters}>
        <Text style={s.title}>Purchases</Text>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>From</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              value={from}
              onChangeText={setFrom}
              autoCapitalize="none"
              keyboardType={Platform.select({ ios: 'numbers-and-punctuation', android: 'numeric' })}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>To</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              value={to}
              onChangeText={setTo}
              autoCapitalize="none"
              keyboardType={Platform.select({ ios: 'numbers-and-punctuation', android: 'numeric' })}
            />
          </View>
        </View>

        <Text style={s.label}>Search</Text>
        <TextInput
          style={s.input}
          placeholder="Supplier or user…"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />

        <View style={s.actions}>
          <TouchableOpacity onPress={applyFilters} style={s.btn}>
            <Text style={s.btnText}>Reload</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openNew} style={[s.btn, s.btnLight]}>
            <Text style={[s.btnText, { color: '#000' }]}>Add Purchase</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={rows}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.2}
        onEndReached={loadMore}
        ListEmptyComponent={
          loading ? (
            <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
          ) : (
            <Text style={s.empty}>No purchases</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openDetail(item.id)} activeOpacity={0.7}>
            <View style={s.rowItem}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {item.Supplier?.name ?? '—'} • {item.Store?.name ?? 'Store'}
                </Text>
                <Text style={s.rowSub}>
                  {new Date(item.createdAt).toLocaleString()} • {item.status}
                </Text>
              </View>
              <Text style={s.rowAmt}>${money(item.total_cost_usd)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          loading && rows.length > 0 ? (
            <View style={{ paddingVertical: 16 }}><ActivityIndicator /></View>
          ) : done ? (
            <View style={{ height: 12 }} />
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

/** ---- Styles ---- */
const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  filters: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e1e1e1',
    borderRadius: 10, padding: 12, backgroundColor: 'white',
  },
  row: { flexDirection: 'row' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnLight: { backgroundColor: '#eee' },
  btnText: { color: '#fff', fontWeight: '800' },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    gap: 12,
  },
  rowTitle: { fontWeight: '800' },
  rowSub: { color: '#666', marginTop: 2 },
  rowAmt: { fontWeight: '900' },

  center: { alignItems: 'center', padding: 24 },
  empty: { textAlign: 'center', color: '#777', marginTop: 20 },
});