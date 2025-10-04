// app/exchange-rates/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ActivityIndicator,
  FlatList, TouchableOpacity, TextInput, RefreshControl
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';


/** —— TEMP auth (move to secure storage) —— */


const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type RateRow = {
  id: string;
  as_of_date: string; // ISO
  rate_accounting: number | string;
  rate_sell_usd_to_sos: number | string;
  rate_buy_usd_with_sos: number | string;
  setter?: { id: string; username: string } | null;
  createdAt?: string;
};

const n2 = (v: any) => {
  const x = Number.parseFloat(String(v));
  return Number.isFinite(x) ? x.toFixed(2) : '0.00';
};

export default function ExchangeRatesIndex() {
  const router = useRouter();

  const [rows, setRows] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  // range + paging
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const [done, setDone] = useState(false);

  const load = useCallback(async (reset = false) => {
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
        order: 'as_of_date',
        dir: 'DESC',
        ...(since.trim() ? { since: since.trim() } : {}),
        ...(until.trim() ? { until: until.trim() } : {}),
      }).toString();

      const r = await fetch(`${API_BASE}/api/exchange-rates?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const data: RateRow[] = j?.data ?? [];
      setRows(prev => (reset ? data : [...prev, ...data]));
      if (data.length < limit) setDone(true);
      setPage({ limit, offset: offset + limit });
    } catch (e: any) {
      setErr(e?.message || 'Failed to load exchange rates');
      if (reset) setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page.limit, page.offset, since, until]);

  useEffect(() => { load(true); }, []); // initial

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  const header = useMemo(() => (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={s.title}>Exchange Rates</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="From (YYYY-MM-DD)"
          value={since}
          onChangeText={setSince}
          style={[s.input, { flex: 1 }]}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="To (YYYY-MM-DD)"
          value={until}
          onChangeText={setUntil}
          style={[s.input, { flex: 1 }]}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => load(true)} style={s.btn}>
          <Text style={s.btnTxt}>Reload</Text>
        </TouchableOpacity>
      </View>

      {err ? <Text style={{ color: '#b00020' }}>⚠️ {err}</Text> : null}
    </View>
  ), [since, until, err, load]);

  const footer = useMemo(() => (
    <View style={{ padding: 16, alignItems: 'center' }}>
      {!done ? (
        <TouchableOpacity style={s.more} onPress={() => load(false)} disabled={loading}>
          <Text style={{ fontWeight: '800' }}>{loading ? 'Loading…' : 'Load more'}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: '#777' }}>— End —</Text>
      )}
    </View>
  ), [done, loading, load]);

  const openNew = () => router.push({ pathname: '/exchange-rates/new' as const });

  const onOpenDetail = useCallback((id: string) => {
    router.push(`/exchange-rates/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: RateRow }) => (
    <TouchableOpacity onPress={() => onOpenDetail(item.id)} activeOpacity={0.7}>
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={s.cardTitle}>
              {String(item.as_of_date).slice(0, 19).replace('T', ' ')}
            </Text>
            {item.setter?.username ? (
              <Text style={s.setter}>by {item.setter.username}</Text>
            ) : null}
          </View>
          <Text style={s.chev}>›</Text>
        </View>

        <View style={s.kv}>
          <Text style={s.k}>Accounting</Text>
          <Text style={s.v}>{n2(item.rate_accounting)} SOS / USD</Text>
        </View>
        <View style={s.kv}>
          <Text style={s.k}>Sell USD→SOS</Text>
          <Text style={s.v}>{n2(item.rate_sell_usd_to_sos)}</Text>
        </View>
        <View style={s.kv}>
          <Text style={s.k}>Buy USD⇐SOS</Text>
          <Text style={s.v}>{n2(item.rate_buy_usd_with_sos)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [onOpenDetail]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Rates',
          headerRight: () => (
            <TouchableOpacity onPress={openNew} style={s.headerBtn}>
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
          ListFooterComponent={rows.length ? footer : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  headerBtnTxt: { color: '#fff', fontWeight: '800' },

  title: { fontWeight: '800', fontSize: 20 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  btn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnTxt: { color: '#fff', fontWeight: '800' },

  more: { backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontWeight: '800', fontSize: 16, marginBottom: 4 },
  setter: { fontWeight: '700', color: '#666' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  k: { fontWeight: '700', color: '#666' },
  v: { fontWeight: '800' },
  chev: { fontSize: 24, fontWeight: '800', color: '#aaa' },
});