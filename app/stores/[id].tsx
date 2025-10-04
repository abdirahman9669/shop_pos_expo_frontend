// app/stores/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, FlatList, RefreshControl
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/** TEMP auth */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Row = { product_id: string; sku?: string; name: string; qty_on_hand: number | string; value_usd: number | string };

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function StoreInventory() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const [done, setDone] = useState(false);
  const [totals, setTotals] = useState<{ product_count: number; total_qty: number; total_value_usd: number } | null>(null);

  const load = useCallback(async (reset = false) => {
    if (!id) return;
    setErr('');
    if (reset) { setPage({ limit: 50, offset: 0 }); setDone(false); }
    const limit = reset ? 50 : page.limit;
    const offset = reset ? 0 : page.offset;

    try {
      const qs = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        order: 'name',
        dir: 'ASC',
        ...(q.trim() ? { q: q.trim() } : {}),
      }).toString();

      const r = await fetch(`${API_BASE}/api/stores/${id}/inventory?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const data: Row[] = j?.data ?? [];
      setRows(prev => (reset ? data : [...prev, ...data]));
      setTotals(j?.totals ?? null);

      if (data.length < limit) setDone(true);
      setPage({ limit, offset: offset + limit });
    } catch (e: any) {
      setErr(e?.message || 'Failed to load inventory');
      if (reset) setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, page.limit, page.offset, q]);

  useEffect(() => { load(true); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  const header = useMemo(() => (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={s.h1}>{name || 'Store'}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Search products…"
          value={q}
          onChangeText={setQ}
          style={s.search}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => load(true)}
        />
        <TouchableOpacity onPress={() => load(true)} style={s.searchBtn}>
          <Text style={s.searchBtnTxt}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* table header */}
      <View style={[s.row, s.headerRow]}>
        <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
        <Text style={[s.cell, s.colQty, s.headerText]}>qty</Text>
        <Text style={[s.cell, s.colValue, s.headerText]}>value</Text>
      </View>
    </View>
  ), [q, name, load]);

  const renderItem = useCallback(({ item }: { item: Row }) => (
    <View style={[s.row, s.dataRow]}>
      <Text style={[s.cell, s.colName]} numberOfLines={1}>
        {item.name || item.sku || item.product_id}
      </Text>
      <Text style={[s.cell, s.colQty]}>{Number(item.qty_on_hand || 0)}</Text>
      <Text style={[s.cell, s.colValue]}>{money(item.value_usd || 0)}</Text>
    </View>
  ), []);

  const footer = useMemo(() => (
    <View style={{ padding: 16, alignItems: 'center' }}>
      {!done ? (
        <TouchableOpacity style={s.loadMore} onPress={() => load(false)} disabled={loading}>
          <Text style={{ fontWeight: '800' }}>{loading ? 'Loading…' : 'Load more'}</Text>
        </TouchableOpacity>
      ) : null}
      {/* Totals bar */}
      {totals ? (
        <View style={s.totalsBar}>
          <Text style={s.totalText}>Items: {totals.product_count}  •  Qty: {Number(totals.total_qty || 0)}</Text>
          <Text style={s.totalText}>Total Value (USD): {money(totals.total_value_usd || 0)}</Text>
        </View>
      ) : null}
    </View>
  ), [done, loading, load, totals]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name ? String(name) : 'Store' }} />
      {loading && rows.length === 0 ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : err && rows.length === 0 ? (
        <View style={s.center}>
          <Text style={{ color: '#b00020' }}>⚠️ {err}</Text>
          <TouchableOpacity onPress={() => load(true)} style={s.btnDark}><Text style={s.btnDarkTxt}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.product_id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 6, backgroundColor: '#fafafa' }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  h1: { fontWeight: '800', fontSize: 20 },

  search: { flex: 1, borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  searchBtn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  searchBtnTxt: { color: 'white', fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10, marginTop: 8 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4, fontWeight: '700' },
  colName: { flexBasis: '56%', flexGrow: 1, flexShrink: 1 },
  colQty: { flexBasis: '16%', flexGrow: 0, flexShrink: 1, textAlign: 'right' },
  colValue: { flexBasis: '28%', flexGrow: 0, flexShrink: 1, textAlign: 'right' },

  loadMore: { backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },

  btnDark: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 10 },
  btnDarkTxt: { color: '#fff', fontWeight: '800' },

  totalsBar: { marginTop: 12, gap: 4, alignItems: 'center' },
  totalText: { fontWeight: '800' },
});