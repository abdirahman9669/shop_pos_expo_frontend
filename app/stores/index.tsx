// app/stores/index.tsx
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
import { API_BASE, TOKEN } from '@/src/config';

/** ===== TEMP auth ===== */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ===== Types ===== */
type StoreRow = {
  id: string;
  name: string;
  type?: string | null;
  createdAt: string;
};

type StoreStats = {
  products_count: number | null;     // null when not available
  inventory_value_usd: number | null;
};

/** ===== Utils ===== */
const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

/** ===== Screen ===== */
export default function StoresIndexScreen() {
  const router = useRouter();

  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  // paging (backend currently returns all; we simulate basic paging)
  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const [done, setDone] = useState(false);

  // per-store stats (products count & inventory value)
  const [stats, setStats] = useState<Record<string, StoreStats>>({});

  /** fetch base list */
  const load = useCallback(async (reset = false) => {
    setErr('');
    if (reset) {
      setPage({ limit: 50, offset: 0 });
      setDone(false);
    }
    const limit = reset ? 50 : page.limit;
    const offset = reset ? 0 : page.offset;

    try {
      // Your current GET /api/stores supports ?shop_id, we’ll just call with no params
      const r = await fetch(`${API_BASE}/api/stores`, { headers: AUTH });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      // Normalize: j can be array (your current code returns rows directly)
      const list: any[] = Array.isArray(j) ? j : (j?.data ?? []);
      // optional client-side filter by name
      const filtered: StoreRow[] = list
        .map((x: any) => ({ id: x.id, name: x.name, type: x.type ?? null, createdAt: x.createdAt }))
        .filter(s => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));

      const slice = filtered.slice(offset, offset + limit);
      setRows(prev => (reset ? slice : [...prev, ...slice]));
      if (offset + limit >= filtered.length) setDone(true);
      setPage({ limit, offset: offset + limit });

      // Kick off stats fetch for any stores we don't have cached yet
      slice.forEach(s => {
        if (!stats[s.id]) {
          fetchStatsForStore(s.id);
        }
      });
    } catch (e: any) {
      setErr(e?.message || 'Failed to load stores');
      if (reset) setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page.limit, page.offset, q, stats]);

  /** fetch stats per store (graceful fallback if endpoint not present) */
  const fetchStatsForStore = useCallback(async (storeId: string) => {
    try {
      // Prefer a dedicated backend if you’ve added it: GET /api/stores/:id/stock-summary
      const r = await fetch(`${API_BASE}/api/stores/${storeId}/stock-summary`, { headers: AUTH });
      if (!r.ok) {
        // Endpoint not available yet: set nulls so UI shows dashes
        setStats(prev => ({ ...prev, [storeId]: { products_count: null, inventory_value_usd: null } }));
        return;
      }
      const j = await r.json();
      const data = j?.ok ? (j?.data ?? j) : j;
      const products_count = Number(data?.products_count ?? data?.count ?? 0);
      const inventory_value_usd = Number(data?.inventory_value_usd ?? data?.value_usd ?? 0);
      setStats(prev => ({ ...prev, [storeId]: { products_count, inventory_value_usd } }));
    } catch {
      setStats(prev => ({ ...prev, [storeId]: { products_count: null, inventory_value_usd: null } }));
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setStats({});
    load(true);
  }, [load]);

  const newStore = () => router.push({ pathname: '/stores/new' as const });

  const openStore = (row: StoreRow) =>
    router.push({ pathname: '/stores/[id]' as const, params: { id: row.id, name: row.name } });

  const header = useMemo(() => (
    <View style={{ padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Search stores by name…"
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
  ), [q, err, load]);

  const footer = useMemo(() => (
    <View style={{ padding: 16, alignItems: 'center' }}>
      {!done ? (
        <TouchableOpacity style={s.loadMore} onPress={() => load(false)} disabled={loading}>
          <Text style={{ fontWeight: '800' }}>{loading ? 'Loading…' : 'Load more'}</Text>
        </TouchableOpacity>
      ) : rows.length ? (
        <Text style={{ color: '#777' }}>— End —</Text>
      ) : null}
    </View>
  ), [done, loading, load, rows.length]);

  const renderItem = useCallback(({ item }: { item: StoreRow }) => {
    const st = stats[item.id];
    const products = st?.products_count ?? null;
    const value = st?.inventory_value_usd ?? null;

    return (
      <TouchableOpacity onPress={() => openStore(item)} activeOpacity={0.7}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={s.title} numberOfLines={1}>{item.name}</Text>
            {item.type ? <Text style={s.badge}>{item.type}</Text> : null}
          </View>

          <View style={s.kv}>
            <Text style={s.k}>Products</Text>
            <Text style={s.v}>{products == null ? '—' : String(products)}</Text>
          </View>
          <View style={s.kv}>
            <Text style={s.k}>Inventory Value (USD)</Text>
            <Text style={s.v}>{value == null ? '—' : money(value)}</Text>
          </View>
          <View style={s.kv}>
            <Text style={s.k}>Created</Text>
            <Text style={s.v}>{String(item.createdAt).slice(0,19).replace('T',' ')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [stats]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Stores',
          headerRight: () => (
            <TouchableOpacity onPress={newStore} style={s.headerBtn}>
              <Text style={s.headerBtnTxt}>+ New</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {loading && rows.length === 0 ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={header}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 16 }}
          ListFooterComponent={footer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

/** ===== Styles ===== */
const s = StyleSheet.create({
  center: { flex:1, alignItems:'center', justifyContent:'center' },

  headerBtn: { backgroundColor:'#000', paddingHorizontal:12, paddingVertical:8, borderRadius:10, marginRight:8 },
  headerBtnTxt: { color:'#fff', fontWeight:'800' },

  search: { flex:1, borderWidth:1, borderColor:'#e1e1e1', borderRadius:10, padding:12, backgroundColor:'#fff' },
  searchBtn: { backgroundColor:'#000', paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  searchBtnTxt: { color:'#fff', fontWeight:'800' },

  card: { backgroundColor:'#fff', borderRadius:12, padding:12, borderWidth:1, borderColor:'#eee' },
  title: { fontWeight:'800', fontSize:16 },
  kv: { flexDirection:'row', justifyContent:'space-between', paddingVertical:2 },
  k: { fontWeight:'700', color:'#666' },
  v: { fontWeight:'700' },

  badge: { paddingHorizontal:8, paddingVertical:4, borderRadius:8, fontWeight:'800', backgroundColor:'#f2f2f2', color:'#333' },

  loadMore: { backgroundColor:'#eee', paddingHorizontal:16, paddingVertical:10, borderRadius:10 },
});