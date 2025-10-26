import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { API_BASE,TOKEN  } from '@/src/config';

const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Row = {
  id: string;
  name: string;
  type?: string;
  normal_side?: 'debit' | 'credit';
  active?: boolean;
  balance_usd?: number;
  createdAt?: string;
};

const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(4) : '0.0000';
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function AccountTypeDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();

  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);

  const [from, setFrom] = useState(ymd(jan1));
  const [to, setTo] = useState(ymd(today));
  const [activeOnly, setActiveOnly] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.balance_usd) || 0), 0),
    [rows]
  );

  const fetchAccounts = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams({
        type_id: String(id),
        active: String(activeOnly),
        from,
        to,
        limit: '200',
      });
      const url = `${API_BASE}/api/accounts/with-balances?${qs.toString()}`;
      const r = await fetch(url, { headers: authHeaders });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j?.data ?? j ?? []);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load accounts';
      setErr(msg);
      Alert.alert('Error', msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id, from, to, activeOnly]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // 🔗 Go to the account contributors screen
  const onRowPress = (row: Row) => {
    router.push({
      pathname: '/account/[id]',
      params: {
        id: row.id,
        name: row.name,
        from,
        to,
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name || 'Account Type' }} />

      <View style={s.wrap}>
        <Text style={s.title}>{name || 'Account Type Detail'}</Text>

        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>From</Text>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              style={s.input}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>To</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              style={s.input}
            />
          </View>
        </View>

        <View style={s.filterRow}>
          <TouchableOpacity
            style={[s.toggle, activeOnly ? s.toggleOn : s.toggleOff]}
            onPress={() => setActiveOnly(v => !v)}
          >
            <Text style={s.toggleText}>{activeOnly ? 'Active only' : 'All accounts'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.reloadBtn} onPress={fetchAccounts} disabled={loading}>
            <Text style={s.reloadText}>{loading ? 'Loading…' : 'Reload'}</Text>
          </TouchableOpacity>
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading accounts…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListHeaderComponent={
            <View style={[s.row, s.headerRow]}>
              <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
              <Text style={[s.cell, s.colType, s.headerText]}>type</Text>
              <Text style={[s.cell, s.colSide, s.headerText]}>normal</Text>
              <Text style={[s.cell, s.colBal, s.headerText]}>balance_usd</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onRowPress(item)} activeOpacity={0.7}>
              <View style={[s.row, s.dataRow]}>
                <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.cell, s.colType]} numberOfLines={1}>{item.type || ''}</Text>
                <Text style={[s.cell, s.colSide]} numberOfLines={1}>{item.normal_side || ''}</Text>
                <Text style={[s.cell, s.colBal]} numberOfLines={1}>{money(item.balance_usd)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={s.footer}>
              <Text style={s.totalText}>Total (USD): {money(total)}</Text>
            </View>
          }
          ListEmptyComponent={<Text style={s.empty}>No accounts found.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 8 },
  title: { fontWeight: '800', fontSize: 18 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  toggle: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, flex: 1, alignItems: 'center' },
  toggleOn: { backgroundColor: '#000' },
  toggleOff: { backgroundColor: '#d9d9d9' },
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
  colName: { flexBasis: '44%', flexGrow: 1, flexShrink: 1 },
  colType: { flexBasis: '22%', flexGrow: 0, flexShrink: 1 },
  colSide: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colBal: { flexBasis: '18%', flexGrow: 0, flexShrink: 1, textAlign: 'right' },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, alignItems: 'flex-end' },
  totalText: { fontWeight: '800', fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
});