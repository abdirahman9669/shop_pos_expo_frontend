import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

import { loadAuth } from '@/src/auth/storage';

async function authHeaders() {
  const auth = await loadAuth();           // { token, user, shop, ... } or null
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}), 
  };
}

// TEMP auth; move to secure storage



type Payment = {
  id: string;
  createdAt: string;
  direction: 'IN'|'OUT';
  method: string;          // e.g. CASH_USD, WALLET_EVC
  currency: 'USD'|'SOS';
  amount_usd: number;
  customer_id?: string | null;
  supplier_id?: string | null;
  sale_id?: string | null;
  Customer?: { id: string; name: string; phone?: string | null } | null;
  Supplier?: { id: string; name: string; phone?: string | null } | null;
  Sale?: { id: string; native_currency: string; total_usd: number } | null;
};

type ListResp = { ok: boolean; total: number; limit: number; offset: number; data: Payment[] };

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const money = (v: any) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function PaymentsScreen() {
  const router = useRouter();

  // filters
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);

  const [dateFrom, setDateFrom] = useState(ymd(jan1));
  const [dateTo, setDateTo] = useState(ymd(today));
  const [direction, setDirection] = useState<'ALL'|'IN'|'OUT'>('ALL');
  const [method, setMethod] = useState('');      // exact match (CASH_USD, etc.)
  const [currency, setCurrency] = useState<'ALL'|'USD'|'SOS'>('ALL');
  const [minUsd, setMinUsd] = useState('');
  const [maxUsd, setMaxUsd] = useState('');

  // data
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount_usd||0) * (r.direction === 'IN' ? 1 : -1), 0), [rows]);

  const load = useCallback(async () => {
    setErr(''); setLoading(true);
    try {
      const params: Record<string,string> = {
        date_from: dateFrom, date_to: dateTo, limit: '200', order: 'createdAt', dir: 'DESC',
      };
      if (direction !== 'ALL') params.direction = direction;
      if (currency !== 'ALL') params.currency = currency;
      if (method.trim()) params.method = method.trim();
      if (minUsd.trim()) params.min_usd = minUsd.trim();
      if (maxUsd.trim()) params.max_usd = maxUsd.trim();

      const url = `${API_BASE}/api/payments?${new URLSearchParams(params).toString()}`;
      const r = await fetch(url, { headers: await authHeaders() });
      const j: ListResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setRows(j.data || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setRows([]);
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, direction, currency, method, minUsd, maxUsd]);

  useEffect(() => { load(); }, [load]);

  const keyExtractor = (p: Payment, i: number) => `${p.id}:${p.createdAt}:${i}`;

  const party = (p: Payment) =>
    p.Customer?.name || p.Supplier?.name || (p.sale_id ? 'Sale Payment' : '(No party)');

  const badgeStyle = (p: Payment) => [
    s.badge,
    p.direction === 'IN' ? s.badgeIn : s.badgeOut
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Payments' }} />

      <View style={s.top}>
        <View style={s.topRow}>
          <Text style={s.h1}>Payments</Text>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => router.push('/payments/new' as any)} // stub route you can add later
          >
            <Text style={s.newBtnText}>➕ New payment</Text>
          </TouchableOpacity>
        </View>

        <View style={s.controlsRow}>
          <View style={{flex:1}}>
            <Text style={s.label}>From</Text>
            <TextInput style={s.input} value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{width:10}}/>
          <View style={{flex:1}}>
            <Text style={s.label}>To</Text>
            <TextInput style={s.input} value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <View style={s.controlsRow}>
          <TouchableOpacity
            style={[s.btn, s.btnAlt]}
            onPress={() => {
              const options: typeof direction[] = ['ALL','IN','OUT'];
              const next = options[(options.indexOf(direction)+1)%options.length];
              setDirection(next);
            }}
          >
            <Text style={s.btnText}>direction: {direction.toLowerCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnAlt]}
            onPress={() => {
              const opts: typeof currency[] = ['ALL','USD','SOS'];
              const next = opts[(opts.indexOf(currency)+1)%opts.length];
              setCurrency(next);
            }}
          >
            <Text style={s.btnText}>currency: {currency.toLowerCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.btnDark]} onPress={load} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Loading…' : 'Reload'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.controlsRow}>
          <View style={{flex:1}}>
            <Text style={s.label}>method (exact)</Text>
            <TextInput style={s.input} value={method} onChangeText={setMethod} placeholder="CASH_USD / WALLET_EVC…" />
          </View>
        </View>

        <View style={s.controlsRow}>
          <View style={{flex:1}}>
            <Text style={s.label}>min_usd</Text>
            <TextInput style={s.input} value={minUsd} onChangeText={setMinUsd} keyboardType="decimal-pad" />
          </View>
          <View style={{width:10}}/>
          <View style={{flex:1}}>
            <Text style={s.label}>max_usd</Text>
            <TextInput style={s.input} value={maxUsd} onChangeText={setMaxUsd} keyboardType="decimal-pad" />
          </View>
        </View>

        {err ? <Text style={s.err}>⚠️ {err}</Text> : null}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator/><Text style={{marginTop:8}}>Loading…</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListHeaderComponent={
            <View style={[s.row, s.headerRow]}>
              <Text style={[s.cell, s.cWhen, s.headerText]}>when / party</Text>
              <Text style={[s.cell, s.cMeth, s.headerText]}>method</Text>
              <Text style={[s.cell, s.cAmt,  s.headerText, s.right]}>amount_usd</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/payments/[id]', params: { id: item.id } })}
            >
              <View style={[s.row, s.dataRow]}>
                <View style={[s.cell, s.cWhen]}>
                  <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                    <View style={badgeStyle(item)}>
                      <Text style={s.badgeText}>{item.direction}</Text>
                    </View>
                    <Text style={{fontWeight:'700'}} numberOfLines={1}>
                      {item.createdAt.slice(0,10)}
                    </Text>
                  </View>
                  <Text style={{color:'#666'}} numberOfLines={1}>{party(item)}</Text>
                </View>

                <Text style={[s.cell, s.cMeth]} numberOfLines={1}>
                  {item.method} • {item.currency}
                </Text>

                <Text style={[s.cell, s.cAmt, s.right, {fontWeight:'800'}]}>
                  {money(item.amount_usd)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={s.footer}>
              <Text style={{fontWeight:'800', fontSize:16}}>
                Net (IN−OUT) USD: {money(total)}
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={{textAlign:'center', color:'#777', marginTop:12}}>No payments.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top:{padding:16, gap:10},
  topRow:{flexDirection:'row', justifyContent:'space-between', alignItems:'center'},
  h1:{fontWeight:'800', fontSize:20},
  newBtn:{backgroundColor:'#000', paddingHorizontal:12, paddingVertical:10, borderRadius:10},
  newBtnText:{color:'#fff', fontWeight:'800'},

  label:{fontWeight:'700', marginBottom:6},
  input:{borderWidth:1, borderColor:'#e1e1e1', borderRadius:10, padding:12, backgroundColor:'#fff'},
  controlsRow:{flexDirection:'row', alignItems:'center', gap:12},

  btn:{paddingHorizontal:12, paddingVertical:10, borderRadius:10, alignItems:'center', justifyContent:'center'},
  btnDark:{backgroundColor:'#000'}, btnAlt:{backgroundColor:'#555'},
  btnText:{color:'#fff', fontWeight:'800'},

  err:{color:'#b00020', marginHorizontal:16},

  sep:{height:6, backgroundColor:'#fafafa'},
  row:{flexDirection:'row', alignItems:'center', paddingHorizontal:12, minHeight:52},
  headerRow:{backgroundColor:'#f4f4f4', borderBottomWidth:1, borderBottomColor:'#ebebeb', paddingVertical:10},
  headerText:{fontWeight:'800', color:'#333', textTransform:'uppercase', fontSize:12, letterSpacing:0.5},
  dataRow:{backgroundColor:'#fff', paddingVertical:10},

  cell:{paddingHorizontal:4},
  cWhen:{flexBasis:'48%', flexGrow:1, flexShrink:1},
  cMeth:{flexBasis:'26%', flexGrow:0, flexShrink:1},
  cAmt:{ flexBasis:'26%', flexGrow:0, flexShrink:1 },

  right:{textAlign:'right'},
  footer:{paddingHorizontal:16, paddingTop:10, paddingBottom:18, alignItems:'flex-end'},
  center:{flex:1, alignItems:'center', justifyContent:'center'},

  badge:{paddingHorizontal:8, paddingVertical:2, borderRadius:6},
  badgeIn:{backgroundColor:'#2a6'}, badgeOut:{backgroundColor:'#b33'},
  badgeText:{color:'#fff', fontWeight:'800', fontSize:11},
});