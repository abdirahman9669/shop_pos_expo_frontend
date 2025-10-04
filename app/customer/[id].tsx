// app/customer/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, FlatList
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

// TEMP auth (move to secure storage)

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Tx = {
  id: string;
  date: string;             // ISO
  createdAt: string;        // ISO
  reference_type: 'SALE'|'SALE_PAYMENT'|'PAYMENT'|'RETURN'|string;
  reference_id: string;
  debit_account:  { id: string; name: string } | null;
  credit_account: { id: string; name: string } | null;
  amount_usd: number;
  native_amount: number | null;
  native_currency: string | null;
  direction: 'DEBIT' | 'CREDIT';
  signed_amount_usd: number;
  running_balance_usd?: number;
};

type ApiResp = {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  data: Tx[];
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const money = (v: any, dp=2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const shortRef = (t: string, id: string) => `${t} ${id.slice(0, 8)}`;

export default function CustomerDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  // Filters
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState(ymd(jan1));
  const [to, setTo] = useState(ymd(today));
  const [qType, setQType] = useState<'ALL'|'SALE'|'SALE_PAYMENT'|'PAYMENT'|'RETURN'>('ALL');
  const [includeRunning, setIncludeRunning] = useState(true);

  // Data
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.signed_amount_usd || 0), 0),
    [rows]
  );

  const load = useCallback(async () => {
    if (!id) return;
    setErr(''); setLoading(true);
    try {
      const params: Record<string,string> = {
        from, to, limit: '200', order: 'date', dir: 'DESC',
        include_running: includeRunning ? 'true' : 'false',
      };
      if (qType !== 'ALL') params.type = qType;

      const qs = new URLSearchParams(params).toString();
      const url = `${API_BASE}/api/customers/${id}/transactions?${qs}`;
      const r = await fetch(url, { headers: AUTH });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setRows(j.data || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setRows([]);
    } finally { setLoading(false); }
  }, [id, from, to, qType, includeRunning]);

  useEffect(() => { load(); }, [load]);

  const keyExtractor = (tx: Tx, idx: number) =>
    // unique & stable even if same id appears (rare) — add createdAt + idx
    `${tx.id}:${tx.createdAt}:${idx}`;

  const header = () => (
    <View style={[s.row, s.headerRow]}>
      <Text style={[s.cell, s.cWhen, s.headerText]}>date / ref</Text>
      <Text style={[s.cell, s.cDir,  s.headerText, s.right]}>signed_amount_usd</Text>
      {includeRunning && <Text style={[s.cell, s.cRun, s.headerText, s.right]}>running</Text>}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name || 'Customer' }} />

      {/* Controls */}
      <View style={s.top}>
        <Text style={s.h1}>{name || 'Customer'}</Text>

        <View style={s.controlsRow}>
          <View style={{flex:1}}>
            <Text style={s.label}>From</Text>
            <TextInput style={s.input} value={from} onChangeText={setFrom}
              placeholder="YYYY-MM-DD" autoCapitalize="none"
            />
          </View>
          <View style={{width:10}}/>
          <View style={{flex:1}}>
            <Text style={s.label}>To</Text>
            <TextInput style={s.input} value={to} onChangeText={setTo}
              placeholder="YYYY-MM-DD" autoCapitalize="none"
            />
          </View>
        </View>

        <View style={s.controlsRow}>
          <TouchableOpacity
            style={[s.btn, s.btnAlt]}
            onPress={() => {
              const list: any[] = ['ALL','SALE','SALE_PAYMENT','PAYMENT','RETURN'];
              const next = list[(list.indexOf(qType) + 1) % list.length] as typeof qType;
              setQType(next);
            }}
          >
            <Text style={s.btnText}>type: {qType.toLowerCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, includeRunning ? s.btnOn : s.btnOff]}
            onPress={() => setIncludeRunning(v => !v)}
          >
            <Text style={s.btnText}>{includeRunning ? 'running: on' : 'running: off'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.btnDark]} onPress={load} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Loading…' : 'Reload'}</Text>
          </TouchableOpacity>
        </View>

        {err ? <Text style={s.err}>⚠️ {err}</Text> : null}
      </View>

      {/* Table */}
      {loading ? (
        <View style={s.center}><ActivityIndicator/><Text style={{marginTop:8}}>Loading…</Text></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={() => <View style={s.sep}/>}
          ListHeaderComponent={header()}
          renderItem={({ item }) => (
            <View style={[s.row, s.dataRow]}>
              <View style={[s.cell, s.cWhen]}>
                <Text style={{fontWeight:'600'}} numberOfLines={1}>
                  {item.date.slice(0,10)} • {shortRef(item.reference_type, item.reference_id)}
                </Text>
                <Text style={{color:'#777', fontSize:12}} numberOfLines={1}>
                  {item.debit_account?.name || '?'} → {item.credit_account?.name || '?'}
                </Text>
              </View>

              <Text style={[s.cell, s.cDir, s.right, { color: item.signed_amount_usd >= 0 ? '#0a7' : '#c00', fontWeight:'700' }]}>
                {money(item.signed_amount_usd)}
              </Text>

              {includeRunning && (
                <Text style={[s.cell, s.cRun, s.right]}>
                  {money(item.running_balance_usd ?? 0)}
                </Text>
              )}
            </View>
          )}
          ListFooterComponent={
            <View style={s.footer}>
              <Text style={{fontWeight:'800', fontSize:16}}>
                Net change (USD): {money(total)}
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={{textAlign:'center', color:'#777', marginTop:12}}>No transactions.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top:{padding:16,gap:10},
  h1:{fontWeight:'800',fontSize:20},
  label:{fontWeight:'700',marginBottom:6},
  input:{borderWidth:1,borderColor:'#e1e1e1',borderRadius:10,padding:12,backgroundColor:'white'},
  controlsRow:{flexDirection:'row',alignItems:'center',gap:12},
  btn:{paddingHorizontal:12,paddingVertical:10,borderRadius:10,alignItems:'center',justifyContent:'center'},
  btnDark:{backgroundColor:'#000'}, btnAlt:{backgroundColor:'#444'},
  btnOn:{backgroundColor:'#2a6'}, btnOff:{backgroundColor:'#aaa'},
  btnText:{color:'white',fontWeight:'800'},
  err:{color:'#b00020', marginHorizontal:16},
  sep:{height:6, backgroundColor:'#fafafa'},
  row:{flexDirection:'row', alignItems:'center', paddingHorizontal:12, minHeight:52},
  headerRow:{backgroundColor:'#f4f4f4', borderBottomWidth:1, borderBottomColor:'#ebebeb', paddingVertical:10},
  headerText:{fontWeight:'800', color:'#333', textTransform:'uppercase', fontSize:12, letterSpacing:0.5},
  dataRow:{backgroundColor:'white', paddingVertical:10},
  cell:{paddingHorizontal:4},
  cWhen:{flexBasis:'55%', flexGrow:1, flexShrink:1},
  cDir:{flexBasis:'25%', flexGrow:0, flexShrink:1},
  cRun:{flexBasis:'20%', flexGrow:0, flexShrink:1},
  right:{textAlign:'right'},
  footer:{paddingHorizontal:16, paddingTop:10, paddingBottom:18, alignItems:'flex-end'},
  center:{flex:1, alignItems:'center', justifyContent:'center'},
});