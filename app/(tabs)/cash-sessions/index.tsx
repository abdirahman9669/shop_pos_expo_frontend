import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Switch, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE,TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

// if you prefer, lift this to a config file
const SHOP_ID = '11111111-1111-4111-8111-111111111111';

type Session = {
  id: string;
  shop_id: string;
  device_id: string;
  opened_by: string;
  opened_at: string;
  opening_cash_usd: number;
  opening_cash_sos: number;
  closed_at: string | null;
  closing_cash_usd?: number | null;
  closing_cash_sos?: number | null;
  createdAt?: string;
};

const fmt = (s: string) => s?.slice(0,19).replace('T',' ') || '';

export default function CashSessionsIndex() {
  const router = useRouter();
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        shop_id: SHOP_ID,
        ...(onlyOpen ? { open: '1' } : {}),
      }).toString();
      const r = await fetch(`${API_BASE}/api/cash-sessions?${qs}`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(Array.isArray(j) ? j : (j?.data ?? j ?? []));
    } catch (e: any) {
      setErr(e?.message || 'Failed to load sessions');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onlyOpen]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const openNew = () => router.push('/cash-sessions/new' as const);
  const openDetail = (id: string) => router.push({ pathname: '/cash-sessions/[id]' as const, params: { id } });

  const header = useMemo(() => (
    <View style={{ padding: 16, gap: 10 }}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <Text style={{ fontWeight:'800' }}>Filter</Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <Text style={{ fontWeight:'700' }}>Open only</Text>
          <Switch value={onlyOpen} onValueChange={setOnlyOpen} />
        </View>
      </View>
      {!!err && <Text style={{ color:'#b00020' }}>⚠️ {err}</Text>}
    </View>
  ), [onlyOpen, err]);

  const renderItem = ({ item }: { item: Session }) => {
    const status = item.closed_at ? 'CLOSED' : 'OPEN';
    return (
      <TouchableOpacity onPress={() => openDetail(item.id)} activeOpacity={0.75}>
        <View style={s.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
            <Text style={s.title}>Session {item.id.slice(0,8)}</Text>
            <Text style={[s.badge, item.closed_at ? s.badgeClosed : s.badgeOpen]}>{status}</Text>
          </View>
          <View style={s.kv}><Text style={s.k}>Device</Text><Text style={s.v}>{item.device_id.slice(0,8)}</Text></View>
          <View style={s.kv}><Text style={s.k}>Opened</Text><Text style={s.v}>{fmt(item.opened_at)}</Text></View>
          {item.closed_at ? <View style={s.kv}><Text style={s.k}>Closed</Text><Text style={s.v}>{fmt(item.closed_at)}</Text></View> : null}
          <View style={s.kv}><Text style={s.k}>Opening (USD/SOS)</Text><Text style={s.v}>{item.opening_cash_usd?.toFixed?.(2) ?? 0} / {item.opening_cash_sos ?? 0}</Text></View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex:1 }}>
      <Stack.Screen
        options={{
          title: 'Cash Sessions',
          headerRight: () => (
            <TouchableOpacity onPress={openNew} style={s.headerBtn}><Text style={s.headerBtnTxt}>+ Open</Text></TouchableOpacity>
          ),
        }}
      />
      {loading && rows.length === 0 ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop:8 }}>Loading…</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={header}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height:10 }} />}
          contentContainerStyle={{ padding:16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center:{ flex:1, alignItems:'center', justifyContent:'center' },
  headerBtn:{ backgroundColor:'#000', paddingHorizontal:12, paddingVertical:8, borderRadius:10, marginRight:8 },
  headerBtnTxt:{ color:'#fff', fontWeight:'800' },
  card:{ backgroundColor:'#fff', borderRadius:12, padding:12, borderWidth:1, borderColor:'#eee' },
  title:{ fontWeight:'800', fontSize:16 },
  kv:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:2 },
  k:{ fontWeight:'700', color:'#666' }, v:{ fontWeight:'700' },
  badge:{ paddingHorizontal:8, paddingVertical:4, borderRadius:8, fontWeight:'800' },
  badgeOpen:{ backgroundColor:'#e9fff0', color:'#0a7d36' },
  badgeClosed:{ backgroundColor:'#fff5e6', color:'#8a5a00' },
});