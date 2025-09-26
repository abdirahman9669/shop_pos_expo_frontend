// app/suppliers/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE } from '@/src/config';

/** TEMP auth (move to secure storage) */
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODYzNjc4OSwiZXhwIjoxNzU5MjQxNTg5fQ.t0NJ-WuV9YW4IDt-uDjIAWm-ROOVjJigp-PbCgWxdRU';
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type SupplierRow = {
  id: string;
  name: string;
  phone?: string | null;
  createdAt: string;
  balance_usd: string | number;
};

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function SuppliersIndex() {
  const router = useRouter();

  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const [done, setDone] = useState(false);

  const load = useCallback(
    async (reset = false) => {
      setErr('');
      if (reset) {
        setPage({ limit: 50, offset: 0 });
        setDone(false);
      }
      const limit = reset ? 50 : page.limit;
      const offset = reset ? 0 : page.offset;

      try {
        const qs = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          order: 'createdAt',
          dir: 'DESC',
          ...(q.trim() ? { q: q.trim() } : {}),
        }).toString();

        // GET /api/suppliers returns balance_usd per supplier
        const r = await fetch(`${API_BASE}/api/suppliers?${qs}`, { headers: AUTH });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

        const data: SupplierRow[] = (j?.data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          phone: s.phone ?? '',
          createdAt: s.createdAt,
          balance_usd: s.balance_usd ?? '0',
        }));

        setRows((prev) => (reset ? data : [...prev, ...data]));
        if (data.length < limit) setDone(true);
        setPage({ limit, offset: offset + limit });
      } catch (e: any) {
        setErr(e?.message || 'Failed to load suppliers');
        if (reset) setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page.limit, page.offset, q]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const openDetail = (row: SupplierRow) =>
    router.push({
      pathname: '/suppliers/[id]' as const,
      params: {
        id: row.id,
        name: row.name,
        phone: row.phone ?? '',
        balance: String(row.balance_usd ?? '0'),
      },
    });

  const newSupplier = useCallback(() => {
    router.push({ pathname: '/suppliers/new' as const });
  }, [router]);

  const header = useMemo(
    () => (
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="Search suppliers by name/phone…"
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
        {err ? <Text style={{ color: '#b00020' }}>⚠️ {err}</Text> : null}
      </View>
    ),
    [q, err, load]
  );

  const footer = useMemo(
    () => (
      <View style={{ padding: 16, alignItems: 'center' }}>
        {!done ? (
          <TouchableOpacity style={s.loadMore} onPress={() => load(false)} disabled={loading}>
            <Text style={{ fontWeight: '800' }}>{loading ? 'Loading…' : 'Load more'}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: '#777' }}>— End —</Text>
        )}
      </View>
    ),
    [done, loading, load]
  );

  const renderItem = useCallback(
    ({ item }: { item: SupplierRow }) => (
      <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.7}>
        <View style={s.card}>
          <Text style={s.title} numberOfLines={1}>
            {item.name}
          </Text>
          {item.phone ? (
            <View style={s.kv}>
              <Text style={s.k}>Phone</Text>
              <Text style={s.v}>{item.phone}</Text>
            </View>
          ) : null}
          <View style={s.kv}>
            <Text style={s.k}>Balance (USD)</Text>
            <Text style={s.v}>{money(item.balance_usd)}</Text>
          </View>
          <View style={s.kv}>
            <Text style={s.k}>Since</Text>
            <Text style={s.v}>{item.createdAt.slice(0, 19).replace('T', ' ')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Suppliers',
          headerRight: () => (
            <TouchableOpacity onPress={newSupplier} style={s.headerBtn}>
              <Text style={s.headerBtnTxt}>+ New</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {loading && rows.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={header}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 16 }}
          ListFooterComponent={rows.length ? footer : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  headerBtnTxt: { color: '#fff', fontWeight: '800' },

  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  searchBtn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  searchBtnTxt: { color: '#fff', fontWeight: '800' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  title: { fontWeight: '800', fontSize: 16, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  k: { fontWeight: '700', color: '#666' },
  v: { fontWeight: '700' },

  loadMore: { backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});