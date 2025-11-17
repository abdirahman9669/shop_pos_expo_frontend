import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** ====== AUTH (dev only: put token in secure storage later) ====== */

const URL = `${API_BASE}/api/account-types/with-balances`;


/** ====== Types ====== */
type Row = {
  id: string;
  name: string;
  normal_side: 'debit' | 'credit';
  accounts_count: number;
  balance_usd: number;
};
type ApiResp = {
  ok: boolean;
  total: number;
  range: { from: string; to: string };
  data: Row[];
};

/** ====== Helpers ====== */
const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function AccountTypesScreen() {
  const router = useRouter();

  // default the range to the current year; you can change to UI state below
  const [from, setFrom] = useState('2025-01-01');
  const [to, setTo] = useState('2025-12-31');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAll = useMemo(
    () => rows.reduce((s, r) => s + Number(r.balance_usd || 0), 0),
    [rows]
  );

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const r = await fetch(`${URL}?${qs}`, { headers: await authHeaders() });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j as any);
      setRows(j.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

const goToDetail = (row: Row) => {
  // ✅ Type-safe for Expo Router
  router.push({
    pathname: "/account-type/[id]",
    params: { id: row.id, name: row.name },
  });
};
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Top controls */}
      <View style={s.wrap}>
        <Text style={s.title}>Account Types</Text>

        <View style={s.filters}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>From</Text>
            <TextInput
              style={s.input}
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>To</Text>
            <TextInput
              style={s.input}
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={{ width: 10 }} />
          <TouchableOpacity onPress={fetchData} style={s.reloadBtn}>
            <Text style={s.reloadText}>Load</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <TouchableOpacity onPress={fetchData} style={s.errorBox}>
            <Text style={s.errorText}>⚠️ {String(error)}</Text>
            <Text style={{ color: '#333', marginTop: 4 }}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Table header */}
      <View style={[s.row, s.headerRow]}>
        <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
        <Text style={[s.cell, s.colSide, s.headerText]}>side</Text>
        <Text style={[s.cell, s.colCount, s.headerText]}>accounts</Text>
        <Text style={[s.cell, s.colBal, s.headerText]}>balance_usd</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          refreshing={refreshing}
          onRefresh={refresh}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => goToDetail(item)} activeOpacity={0.7}>
              <View style={[s.row, s.dataRow]}>
                <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.cell, s.colSide]} numberOfLines={1}>{item.normal_side}</Text>
                <Text style={[s.cell, s.colCount]} numberOfLines={1}>{item.accounts_count}</Text>
                <Text style={[s.cell, s.colBal]} numberOfLines={1}>{money(item.balance_usd)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>No data for this range.</Text>
          }
          ListFooterComponent={
            rows.length ? (
              <View style={s.footerTotal}>
                <Text style={s.footerTotalText}>Total: {money(totalAll)}</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  filters: { flexDirection: 'row', alignItems: 'flex-end' },
  reloadBtn: { backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  reloadText: { color: 'white', fontWeight: '800' },

  errorBox: { backgroundColor: '#fdecea', borderRadius: 10, padding: 12 },
  errorText: { color: '#b3261e', fontWeight: '700' },

  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colName: { flexBasis: '40%', flexGrow: 1, flexShrink: 1 },
  colSide: { flexBasis: '20%', flexGrow: 0, flexShrink: 1, textTransform: 'capitalize' as any },
  colCount: { flexBasis: '20%', flexGrow: 0, flexShrink: 1, textAlign: 'right' as any },
  colBal: { flexBasis: '20%', flexGrow: 0, flexShrink: 1, textAlign: 'right' as any },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  footerTotal: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  footerTotalText: { fontWeight: '800', fontSize: 16 },

  empty: { textAlign: 'center', color: '#777', marginTop: 12, paddingHorizontal: 16 },
});
