// app/sales/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE } from '@/src/config';

/** TEMP auth (move to secure storage) */
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODYzNjc4OSwiZXhwIjoxNzU5MjQxNTg5fQ.t0NJ-WuV9YW4IDt-uDjIAWm-ROOVjJigp-PbCgWxdRU';
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type SaleRow = {
  id: string;
  createdAt: string;
  status: string;
  total_usd: string | number;
  native_currency?: string;
};

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const minusDaysStr = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
};
const isYYYYMMDD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default function SalesIndexScreen() {
  const router = useRouter();

  // data/paging
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  // filters (dates)
  const [dateFrom, setDateFrom] = useState<string>(''); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>('');     // YYYY-MM-DD

  const hasRange = !!(dateFrom || dateTo);

  const applyPreset = (p: 'today' | '7d' | '30d' | 'all') => {
    if (p === 'all') { setDateFrom(''); setDateTo(''); }
    else if (p === 'today') { setDateFrom(todayStr()); setDateTo(todayStr()); }
    else if (p === '7d') { setDateFrom(minusDaysStr(6)); setDateTo(todayStr()); }
    else { setDateFrom(minusDaysStr(29)); setDateTo(todayStr()); }
    // reload with new range
    setTimeout(() => load(true), 0);
  };

  const load = useCallback(async (reset = false) => {
    setErr('');
    if (reset) {
      setPage({ limit: 50, offset: 0 });
      setDone(false);
      setRows([]);
    }
    const limit = reset ? 50 : page.limit;
    const offset = reset ? 0 : page.offset;

    try {
      const params: Record<string, string> = {
        limit: String(limit),
        offset: String(offset),
      };
      if (dateFrom && isYYYYMMDD(dateFrom)) params.date_from = dateFrom;
      if (dateTo && isYYYYMMDD(dateTo)) params.date_to = dateTo;

      const qs = new URLSearchParams(params).toString();
      const r = await fetch(`${API_BASE}/api/sales?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const data: SaleRow[] = Array.isArray(j.data) ? j.data : [];
      setRows(prev => (reset ? data : [...prev, ...data]));
      if (data.length < limit) setDone(true);
      setPage({ limit, offset: offset + limit });
    } catch (e: any) {
      setErr(e?.message || 'Failed to load sales');
      if (reset) setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page.limit, page.offset, dateFrom, dateTo]);

  useEffect(() => { load(true); }, []); // initial

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const openDetail = (id: string) =>
    router.push({ pathname: '/sales/[id]' as const, params: { id } });

  const newSale = () => router.push({ pathname: '/sale-new' as const });

  const renderItem = useCallback(({ item }: { item: SaleRow }) => (
    <TouchableOpacity onPress={() => openDetail(item.id)} activeOpacity={0.7}>
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.title}>Sale {item.id.slice(0, 8)}</Text>
          <Text style={[s.badge, item.status === 'COMPLETED' ? s.badgeOk : s.badgeWarn]}>
            {item.status}
          </Text>
        </View>
        <View style={s.kv}><Text style={s.k}>When</Text><Text style={s.v}>{item.createdAt.slice(0,19).replace('T',' ')}</Text></View>
        <View style={s.kv}><Text style={s.k}>Total (USD)</Text><Text style={s.v}>{money(item.total_usd)}</Text></View>
        <View style={s.kv}><Text style={s.k}>Currency</Text><Text style={s.v}>{item.native_currency || 'USD'}</Text></View>
      </View>
    </TouchableOpacity>
  ), []);

  const footer = useMemo(() => (
    <View style={{ padding: 16, alignItems: 'center' }}>
      {!done ? (
        <TouchableOpacity style={s.loadMore} onPress={() => load(false)} disabled={loading}>
          <Text style={{ fontWeight: '800' }}>{loading ? 'Loading…' : 'Load more'}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: '#777' }}>— End —</Text>
      )}
    </View>
  ), [done, loading, load]);

  const applyManualDates = () => {
    Keyboard.dismiss();
    load(true);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Sales',
          headerRight: () => (
            <TouchableOpacity onPress={newSale} style={s.headerBtn}>
              <Text style={s.headerBtnTxt}>+ New</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Filters */}
      <View style={s.filters}>
        <Text style={s.filtersTitle}>Range</Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.smallLabel}>From (YYYY-MM-DD)</Text>
            <TextInput
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="2025-09-01"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              style={s.input}
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.smallLabel}>To (YYYY-MM-DD)</Text>
            <TextInput
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="2025-09-30"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              style={s.input}
            />
          </View>
        </View>

        <View style={[s.row, { marginTop: 8 }]}>
          <TouchableOpacity style={[s.pill, !hasRange && s.pillOn]} onPress={() => applyPreset('all')}>
            <Text style={[s.pillTxt, !hasRange && s.pillTxtOn]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pill} onPress={() => applyPreset('today')}>
            <Text style={s.pillTxt}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pill} onPress={() => applyPreset('7d')}>
            <Text style={s.pillTxt}>Last 7d</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pill} onPress={() => applyPreset('30d')}>
            <Text style={s.pillTxt}>Last 30d</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={applyManualDates} style={s.applyBtn}>
            <Text style={s.applyTxt}>Apply</Text>
          </TouchableOpacity>
        </View>

        {hasRange ? (
          <Text style={s.activeRange}>
            Showing: {dateFrom || '…'} → {dateTo || '…'}
          </Text>
        ) : null}
      </View>

      {loading && rows.length === 0 ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : err && rows.length === 0 ? (
        <View style={s.center}>
          <Text style={{ color: '#b00020' }}>⚠️ {err}</Text>
          <TouchableOpacity onPress={() => load(true)} style={[s.headerBtn, { marginTop: 10 }]}>
            <Text style={s.headerBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={rows.length ? footer : undefined}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex:1, alignItems:'center', justifyContent:'center' },

  headerBtn: { backgroundColor:'#000', paddingHorizontal:12, paddingVertical:8, borderRadius:10, marginRight:8 },
  headerBtnTxt: { color:'#fff', fontWeight:'800' },

  filters: { paddingHorizontal:16, paddingTop:10, paddingBottom:6, borderBottomWidth:1, borderBottomColor:'#eee', backgroundColor:'#fafafa' },
  filtersTitle: { fontWeight:'800', marginBottom:6, fontSize:16 },
  row: { flexDirection:'row', alignItems:'center' },
  input: { borderWidth:1, borderColor:'#e1e1e1', borderRadius:10, padding:10, backgroundColor:'#fff' },
  smallLabel: { fontWeight:'600', color:'#666', marginBottom:4 },

  pill: { backgroundColor:'#eee', paddingHorizontal:12, paddingVertical:8, borderRadius:999, marginRight:8 },
  pillOn: { backgroundColor:'#000' },
  pillTxt: { fontWeight:'800' },
  pillTxtOn: { color:'#fff' },

  applyBtn: { backgroundColor:'#000', paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  applyTxt: { color:'#fff', fontWeight:'800' },

  activeRange: { marginTop:8, color:'#555', fontWeight:'600' },

  card: { backgroundColor:'#fff', borderRadius:12, padding:12, borderWidth:1, borderColor:'#eee', marginTop:12 },
  title: { fontWeight:'800', fontSize:16, marginBottom:6 },
  kv: { flexDirection:'row', justifyContent:'space-between', paddingVertical:2 },
  k: { fontWeight:'700', color:'#666' },
  v: { fontWeight:'700' },

  badge: { paddingHorizontal:8, paddingVertical:4, borderRadius:8, fontWeight:'800' },
  badgeOk: { backgroundColor:'#e8fff1', color:'#0a7d36' },
  badgeWarn: { backgroundColor:'#fff7e6', color:'#8a5a00' },

  loadMore: { backgroundColor:'#eee', paddingHorizontal:16, paddingVertical:10, borderRadius:10, marginTop:8 },
});