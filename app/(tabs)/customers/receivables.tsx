import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';


const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Row = {
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  balance_usd: number;
  a0_30?: number; a31_60?: number; a61_90?: number; a90_plus?: number;
};
type ApiResp = { ok: boolean; count: number; rows: Row[] };

const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};

export default function CustomersReceivablesScreen() {   // 👈 DEFAULT EXPORT
  const router = useRouter();
  const [withAging, setWithAging] = useState(false);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.balance_usd || 0), 0), [rows]);

  const load = useCallback(async () => {
    setErr(''); setLoading(true);
    try {
      const qs = new URLSearchParams(withAging ? { with_aging: '1' } : {}).toString();
      const url = `${API_BASE}/api/customers/receivables${qs ? `?${qs}` : ''}`;
      const r = await fetch(url, { headers: AUTH });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load'); setRows([]);
    } finally { setLoading(false); }
  }, [withAging]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => (`${r.customer_name} ${r.customer_phone || ''}`).toLowerCase().includes(q));
  }, [rows, search]);

  const keyExtractor = (r: Row) => r.customer_id;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Receivables' }} />
      {/* Controls */}
      <View style={s.top}>
        <Text style={s.h1}>Customers (Receivables)</Text>
        <View style={s.controls}>
          <TextInput style={[s.input,{flex:1}]} placeholder="Search name / phone…" autoCapitalize="none" value={search} onChangeText={setSearch}/>
          <View style={{width:10}}/>
          <TouchableOpacity onPress={() => setWithAging(v=>!v)} style={[s.btn, withAging ? s.btnOn : s.btnOff]}>
            <Text style={s.btnText}>{withAging ? 'Aging: ON' : 'Aging: OFF'}</Text>
          </TouchableOpacity>
        </View>
        {err ? <TouchableOpacity onPress={load} style={s.errorBox}><Text style={s.errorText}>⚠️ {err}</Text></TouchableOpacity> : null}
      </View>

      {/* Header */}
      <View style={[s.row, s.header]}>
        <Text style={[s.cellName, s.headerText]}>name</Text>
        {withAging && (<><Text style={[s.cellAmt, s.headerText, s.right]}>0–30</Text><Text style={[s.cellAmt, s.headerText, s.right]}>31–60</Text><Text style={[s.cellAmt, s.headerText, s.right]}>61–90</Text><Text style={[s.cellAmt, s.headerText, s.right]}>90+</Text></>)}
        <Text style={[s.cellAmt, s.headerText, s.right]}>balance_usd</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator/><Text style={{marginTop:8}}>Loading…</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          refreshing={refreshing}
          onRefresh={load}
          ItemSeparatorComponent={() => <View style={s.sep}/>}
          renderItem={({item}) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/customers/[id]', params: { id: item.customer_id, name: item.customer_name } })}>
              <View style={[s.row, s.dataRow]}>
                <View style={s.cellName}>
                  <Text style={{fontWeight:'600'}} numberOfLines={1}>{item.customer_name}</Text>
                  {!!item.customer_phone && <Text style={{color:'#777', fontSize:12}}>{item.customer_phone}</Text>}
                </View>
                {withAging && (<>
                  <Text style={[s.cellAmt, s.right]}>{money(item.a0_30)}</Text>
                  <Text style={[s.cellAmt, s.right]}>{money(item.a31_60)}</Text>
                  <Text style={[s.cellAmt, s.right]}>{money(item.a61_90)}</Text>
                  <Text style={[s.cellAmt, s.right]}>{money(item.a90_plus)}</Text>
                </>)}
                <Text style={[s.cellAmt, s.right, {fontWeight:'800'}]}>{money(item.balance_usd)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={s.footer}><Text style={{fontWeight:'800', fontSize:16}}>Total (USD): {money(total)}</Text></View>}
          ListEmptyComponent={<Text style={{textAlign:'center', color:'#777', marginTop:12}}>No open receivables 🎉</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top:{padding:16,gap:12}, h1:{fontWeight:'800',fontSize:20},
  controls:{flexDirection:'row',alignItems:'center'},
  input:{borderWidth:1,borderColor:'#e1e1e1',borderRadius:10,padding:12,backgroundColor:'white'},
  btn:{paddingHorizontal:14,paddingVertical:12,borderRadius:10,alignItems:'center',justifyContent:'center'},
  btnOn:{backgroundColor:'#333'}, btnOff:{backgroundColor:'#bbb'}, btnText:{color:'white',fontWeight:'800'},
  errorBox:{backgroundColor:'#fdecea',borderRadius:10,padding:12}, errorText:{color:'#b3261e',fontWeight:'700'},
  sep:{height:6,backgroundColor:'#fafafa'},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,minHeight:56},
  header:{backgroundColor:'#f4f4f4',borderBottomWidth:1,borderBottomColor:'#ebebeb',paddingVertical:10},
  headerText:{fontWeight:'800',color:'#333',textTransform:'uppercase',fontSize:12,letterSpacing:0.5},
  dataRow:{backgroundColor:'white',paddingVertical:10},
  cellName:{flexBasis:'40%',flexGrow:1,flexShrink:1,paddingRight:8},
  cellAmt:{flexBasis:'15%',flexGrow:0,flexShrink:1},
  right:{textAlign:'right'},
  footer:{paddingHorizontal:16,paddingTop:10,paddingBottom:18,alignItems:'flex-end'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
});