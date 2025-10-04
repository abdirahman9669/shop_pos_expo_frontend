// app/account/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/* ===== TEMP AUTH ===== */
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/* ===== Types ===== */
type CustomerContrib = { customer_id: string; name: string; balance_usd?: number; last_activity?: string | null };
type SupplierContrib = { supplier_id: string; name: string; balance_usd?: number; last_activity?: string | null };
type ProductContrib  = { product_id: string; sku?: string; name: string; on_hand_qty?: number; unit_cost_usd?: number; value_usd?: number };
type JournalRow      = { id: string; date: string; reference_type?: string; reference_id?: string; signed_amount_usd: number };
type Contributor = CustomerContrib | SupplierContrib | ProductContrib | JournalRow;

type ApiResp = {
  ok: boolean;
  account?: { id: string; name: string; type?: string };
  group_by: 'customer' | 'supplier' | 'product' | 'none';
  total: number;
  data: Contributor[];
  range?: { from?: string | null; to?: string | null };
};

/* ===== Helpers ===== */
const isYMD = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
// Strip weird chars (e.g., Unicode dashes) and normalize to YYYY-MM-DD
const normalizeYmd = (s: string) => {
  const t = String(s || '').replace(/[^0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return isYMD(t) ? t : '';
};
const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const isCustomer = (x: any): x is CustomerContrib => !!x && 'customer_id' in x;
const isSupplier = (x: any): x is SupplierContrib => !!x && 'supplier_id' in x;
const isProduct  = (x: any): x is ProductContrib  => !!x && 'product_id' in x && !('signed_amount_usd' in x);
const isJE       = (x: any): x is JournalRow      => !!x && 'signed_amount_usd' in x && 'date' in x;

/* ===== Component ===== */
export default function AccountContributorsScreen() {
  const { id, name, from: fromParam, to: toParam } =
    useLocalSearchParams<{ id: string; name?: string; from?: string; to?: string }>();

  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);

  // seed from route (if valid), else defaults; keep as single source of truth
  const [from, setFrom] = useState<string>(normalizeYmd(String(fromParam ?? '')) || ymdLocal(jan1));
  const [to,   setTo]   = useState<string>(normalizeYmd(String(toParam   ?? '')) || ymdLocal(today));

  const [q, setQ] = useState('');
  const [storeId, setStoreId] = useState('');
  const [groupBy, setGroupBy] = useState<'auto' | 'customer' | 'supplier' | 'product' | 'none'>('auto');

  const [rows, setRows] = useState<Contributor[]>([]);
  const [serverGroupBy, setServerGroupBy] = useState<ApiResp['group_by']>('none');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // prevent stale overwrites
  const abortRef = useRef<AbortController | null>(null);

  const total = useMemo(() => {
    if (serverGroupBy === 'product') {
      return rows.reduce((s, r) => s + (isProduct(r) ? Number(r.value_usd || 0) : 0), 0);
    }
    if (serverGroupBy === 'none') {
      return rows.reduce((s, r) => s + (isJE(r) ? Number(r.signed_amount_usd || 0) : 0), 0);
    }
    return rows.reduce((s, r) => s + Number((r as any).balance_usd || 0), 0);
  }, [rows, serverGroupBy]);

  const buildQuery = () => {
    const qs = new URLSearchParams();
    const f = normalizeYmd(from);
    const t = normalizeYmd(to);
    if (f) qs.set('from', f);
    if (t) qs.set('to', t);
    if (q) qs.set('q', q);
    if (storeId) qs.set('store_id', storeId);
    if (groupBy) qs.set('group_by', groupBy);
    qs.set('limit', '10000');
    qs.set('_', String(Date.now())); // cache-buster
    return qs.toString();
  };

  const fetchContributors = useCallback(async () => {
    if (!id) return;

    // cancel older requests
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setErr('');

    try {
      const url = `${API_BASE}/api/accounts/${id}/contributors?${buildQuery()}`;
      console.log('[contributors GET]', url);
      const r = await fetch(url, { headers: authHeaders, signal: ac.signal, cache: 'no-store' as any });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);

      setRows(j.data || []);
      setServerGroupBy(j.group_by);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg = e?.message || 'Failed to load';
      setErr(msg);
      setRows([]);
      Alert.alert('Error', msg);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [id, from, to, q, storeId, groupBy]);

  // debounce inputs (fires 250ms after last change)
  useEffect(() => {
    const t = setTimeout(() => { fetchContributors(); }, 250);
    return () => clearTimeout(t);
  }, [fetchContributors]);

  const reloadNow = useCallback(() => { fetchContributors(); }, [fetchContributors]);

  /* ===== Header ===== */
  const header = () => {
    if (serverGroupBy === 'product') {
      return (
        <View style={[s.row, s.headerRow]}>
          <Text style={[s.cell, s.wProduct, s.headerText]}>product</Text>
          <Text style={[s.cell, s.wQty, s.headerText, s.right]}>on_hand</Text>
          <Text style={[s.cell, s.wQty, s.headerText, s.right]}>unit_cost</Text>
          <Text style={[s.cell, s.wQty, s.headerText, s.right]}>value_usd</Text>
        </View>
      );
    }
    if (serverGroupBy === 'none') {
      return (
        <View style={[s.row, s.headerRow]}>
          <Text style={[s.cell, s.wide, s.headerText]}>date / ref</Text>
          <Text style={[s.cell, s.narrow, s.headerText, s.right]}>signed_amount_usd</Text>
        </View>
      );
    }
    return (
      <View style={[s.row, s.headerRow]}>
        <Text style={[s.cell, s.wide, s.headerText]}>name</Text>
        <Text style={[s.cell, s.narrow, s.headerText, s.right]}>balance_usd</Text>
      </View>
    );
  };

  /* ===== Row ===== */
  const rowView = (item: Contributor) => {
    if (isProduct(item)) {
      return (
        <View style={[s.row, s.dataRow]}>
          <Text style={[s.cell, s.wProduct]} numberOfLines={1}>
            {item.sku ? `${item.sku} • ` : ''}{item.name}
          </Text>
          <Text style={[s.cell, s.wQty, s.right]}>{item.on_hand_qty ?? 0}</Text>
          <Text style={[s.cell, s.wQty, s.right]}>{money(item.unit_cost_usd, 4)}</Text>
          <Text style={[s.cell, s.wQty, s.right]}>{money(item.value_usd, 4)}</Text>
        </View>
      );
    }
    if (isJE(item)) {
      const ref = [item.reference_type, item.reference_id?.slice(0, 12)].filter(Boolean).join(' ');
      return (
        <View style={[s.row, s.dataRow]}>
          <Text style={[s.cell, s.wide]} numberOfLines={1}>
            {item.date?.slice(0, 10)} • {ref || '—'}
          </Text>
          <Text style={[s.cell, s.narrow, s.right]}>{money(item.signed_amount_usd)}</Text>
        </View>
      );
    }
    const label = (item as any).name || '(Unknown)';
    const bal = (item as any).balance_usd;
    return (
      <View style={[s.row, s.dataRow]}>
        <Text style={[s.cell, s.wide]} numberOfLines={1}>{label}</Text>
        <Text style={[s.cell, s.narrow, s.right]}>{money(bal)}</Text>
      </View>
    );
  };

  /* ===== Keys ===== */
  const keyOf = (it: Contributor, index: number) => {
    if (isCustomer(it) && it.customer_id) return `c:${it.customer_id}`;
    if (isSupplier(it) && it.supplier_id) return `s:${it.supplier_id}`;
    if (isProduct(it)  && it.product_id)  return `p:${it.product_id}`;
    if (isJE(it)      && it.id)           return `je:${it.id}`;
    return `idx:${index}`;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name || 'Account' }} />

      {/* Filters */}
      <View style={s.wrap}>
        <Text style={s.title}>{name || 'Account'}</Text>

        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>From</Text>
            <TextInput
              value={from}
              onChangeText={(v) => setFrom(v)}
              onBlur={() => setFrom(normalizeYmd(from) || from)}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={s.input}
              onSubmitEditing={reloadNow}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>To</Text>
            <TextInput
              value={to}
              onChangeText={(v) => setTo(v)}
              onBlur={() => setTo(normalizeYmd(to) || to)}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={s.input}
              onSubmitEditing={reloadNow}
            />
          </View>
        </View>

        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Search</Text>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="name / sku…"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.input}
              onSubmitEditing={reloadNow}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Store (optional)</Text>
            <TextInput
              value={storeId}
              onChangeText={setStoreId}
              placeholder="store_id"
              autoCapitalize="none"
              autoCorrect={false}
              style={s.input}
              onSubmitEditing={reloadNow}
            />
          </View>
        </View>

        <View style={s.filterRow}>
          <TouchableOpacity
            style={[s.toggle, s.toggleAlt]}
            onPress={() => {
              const next =
                groupBy === 'auto' ? 'customer'
                : groupBy === 'customer' ? 'supplier'
                : groupBy === 'supplier' ? 'product'
                : groupBy === 'product' ? 'none'
                : 'auto';
              setGroupBy(next);
            }}
          >
            <Text style={s.toggleText}>group_by: {groupBy}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.reloadBtn} onPress={reloadNow} disabled={loading}>
            <Text style={s.reloadText}>{loading ? 'Loading…' : 'Reload'}</Text>
          </TouchableOpacity>
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}
      </View>

      {/* Table */}
      {loading ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyOf}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListHeaderComponent={header()}
          renderItem={({ item }) => rowView(item)}
          ListFooterComponent={
            <View style={s.footer}>
              <Text style={s.totalText}>
                {serverGroupBy === 'product'
                  ? 'Total value (USD): '
                  : serverGroupBy === 'none'
                  ? 'Net signed (USD): '
                  : 'Total (USD): '}
                {money(total, serverGroupBy === 'product' ? 4 : 2)}
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={s.empty}>No data for this range.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

/* ===== Styles ===== */
const s = StyleSheet.create({
  wrap: { padding: 16, gap: 8 },
  title: { fontWeight: '800', fontSize: 18 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 8 },

  toggle: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleAlt: { backgroundColor: '#333' },
  toggleText: { color: 'white', fontWeight: '800' },

  reloadBtn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  reloadText: { color: 'white', fontWeight: '800' },

  err: { color: '#b00020', marginHorizontal: 16 },

  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },

  wide: { flexBasis: '70%', flexGrow: 1, flexShrink: 1 },
  narrow: { flexBasis: '30%', flexGrow: 0, flexShrink: 1 },

  wProduct: { flexBasis: '46%', flexGrow: 1, flexShrink: 1 },
  wQty: { flexBasis: '18%', flexGrow: 0, flexShrink: 1 },

  right: { textAlign: 'right' },

  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, alignItems: 'flex-end' },
  totalText: { fontWeight: '800', fontSize: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
});