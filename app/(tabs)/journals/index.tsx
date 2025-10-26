// app/journals/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ActivityIndicator, FlatList,
  TouchableOpacity, TextInput, RefreshControl
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/** TEMP auth (move to secure storage) */

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Row = {
  id: string;
  date: string;
  amount_usd: number;
  native_amount?: number | string | null;
  native_currency?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  debit_account?: { id: string; name: string };
  credit_account?: { id: string; name: string };
  Customer?: { id: string; name: string } | null;
  Supplier?: { id: string; name: string } | null;
};

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function JournalsIndex() {
  const router = useRouter();

  // filters
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'PAYMENT'>('ALL');
  const [q, setQ] = useState('');

  // data/paging
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState({ limit: 50, offset: 0 });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (reset = false) => {
    setErr('');
    if (reset) {
      setPage({ limit: 50, offset: 0 });
      setDone(false);
    }
    const limit = reset ? 50 : page.limit;
    const offset = reset ? 0 : page.offset;

    try {
      const params: Record<string, string> = {
        limit: String(limit),
        offset: String(offset),
        order: 'date',
        dir: 'DESC',
      };
      if (start.trim()) params.start = start.trim();
      if (end.trim()) params.end = end.trim();
      if (q.trim()) params.q = q.trim();
      if (type !== 'ALL') params.reference_type = type;

      const qs = new URLSearchParams(params).toString();
      const r = await fetch(`${API_BASE}/api/journals?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const data: Row[] = (j?.data ?? []).map((x: any) => ({
        id: x.id,
        date: x.date || x.createdAt,
        amount_usd: Number(x.amount_usd || 0),
        native_amount: x.native_amount,
        native_currency: x.native_currency,
        reference_type: x.reference_type,
        reference_id: x.reference_id,
        debit_account: x.debitAccount,
        credit_account: x.creditAccount,
        Customer: x.Customer ?? null,
        Supplier: x.Supplier ?? null,
      }));

      setRows(prev => (reset ? data : [...prev, ...data]));
      if (data.length < limit) setDone(true);
      setPage({ limit, offset: offset + limit });
    } catch (e: any) {
      setErr(e?.message || 'Failed to load journals');
      if (reset) setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page.limit, page.offset, start, end, q, type]);

  useEffect(() => { load(true); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const openDetail = (id: string) =>
    router.push({ pathname: '/journals/[id]' as const, params: { id } });

  const header = useMemo(() => (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={s.title}>Journals</Text>

      {/* Filters row 1: dates */}
      <View style={s.row}>
        <TextInput
          placeholder="From (YYYY-MM-DD)"
          value={start}
          onChangeText={setStart}
          style={[s.input, { flex: 1 }]}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="To (YYYY-MM-DD)"
          value={end}
          onChangeText={setEnd}
          style={[s.input, { flex: 1 }]}
          autoCapitalize="none"
        />
      </View>

      {/* Filters row 2: type + search + reload */}
      <View style={[s.row, { alignItems: 'center' }]}>
        <TouchableOpacity
          onPress={() => setType(prev =>
            prev === 'ALL' ? 'SALE'
            : prev === 'SALE' ? 'PURCHASE'
            : prev === 'PURCHASE' ? 'PAYMENT'
            : 'ALL')}
          style={[s.pill, { backgroundColor: '#222' }]}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            type: {type.toLowerCase()}
          </Text>
        </TouchableOpacity>

        <TextInput
          placeholder="Search…"
          value={q}
          onChangeText={setQ}
          style={[s.input, { flex: 1 }]}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => load(true)}
        />

        <TouchableOpacity onPress={() => load(true)} style={[s.pill, { backgroundColor: '#000' }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Reload</Text>
        </TouchableOpacity>
      </View>

      {err ? <Text style={{ color: '#b00020' }}>⚠️ {err}</Text> : null}

      {/* Table header */}
      <View style={[s.thRow]}>
        <Text style={[s.th, { flex: 1.3 }]}>TYPE</Text>
        <Text style={[s.th, { flex: 1.6 }]}>DATE</Text>
        <Text style={[s.th, { flex: 1.1, textAlign: 'right' }]}>AMOUNT</Text>
        <Text style={[s.th, { flex: 1.8, textAlign: 'right' }]}>DR → CR</Text>
      </View>
    </View>
  ), [start, end, q, type, err, load]);

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

  const renderItem = useCallback(({ item }: { item: Row }) => {
    const type = item.reference_type || '';
    const party = item.Customer?.name || item.Supplier?.name || '';
    const drcr = `${item.debit_account?.name ?? ''} → ${item.credit_account?.name ?? ''}`;
    return (
      <TouchableOpacity onPress={() => openDetail(item.id)} activeOpacity={0.7}>
        <View style={s.trRow}>
          <View style={{ flex: 1.3 }}>
            <Text style={s.tdBold} numberOfLines={1}>{type}</Text>
            {!!party && <Text style={s.tdSub} numberOfLines={1}>{party}</Text>}
          </View>
          <Text style={[s.td, { flex: 1.6 }]} numberOfLines={1}>
            {(item.date || '').slice(0, 19).replace('T', ' ')}
          </Text>
          <Text style={[s.tdAmt, { flex: 1.1 }]}>${money(item.amount_usd)}</Text>
          <Text style={[s.tdRight, { flex: 1.8 }]} numberOfLines={1}>{drcr}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Journals' }} />
      {loading && rows.length === 0 ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={header}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
  title: { fontWeight: '800', fontSize: 20 },
  row: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },

  thRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  th: { fontWeight: '800', color: '#333', fontSize: 12, letterSpacing: 0.4 },

  trRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#eee',
  },
  td: { fontWeight: '700', color: '#222' },
  tdBold: { fontWeight: '800', color: '#111' },
  tdSub: { color: '#777', fontSize: 12 },
  tdRight: { textAlign: 'right', fontWeight: '700', color: '#333' },
  tdAmt: { textAlign: 'right', fontWeight: '800', color: '#111' },

  loadMore: { backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});