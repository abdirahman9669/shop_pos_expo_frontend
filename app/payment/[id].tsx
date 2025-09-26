// app/payment/[id].tsx (or your path)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { API_BASE } from '@/src/config';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODYzNjc4OSwiZXhwIjoxNzU5MjQxNTg5fQ.t0NJ-WuV9YW4IDt-uDjIAWm-ROOVjJigp-PbCgWxdRU';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type LinkedSale = { id: string; native_currency: string; total_usd: number } | null;
type LinkedPurchase = { id: string; total_cost_usd: number } | null;
type LinkedParty = { id: string; name: string; phone?: string | null } | null;

type PaymentRow = {
  id: string;
  createdAt: string;
  direction: 'IN'|'OUT';
  method: string;
  currency: 'USD'|'SOS';
  amount_usd: number;
  amount_native?: number | null;
  sale_id?: string | null;
  purchase_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  Sale?: LinkedSale;
  Purchase?: LinkedPurchase;
  Customer?: LinkedParty;
  Supplier?: LinkedParty;
  // Optional from backend:
  kind?: 'SALE_CHECKOUT'|'RECEIVABLE_PAYMENT'|'PURCHASE_CHECKOUT'|'PAYABLE_PAYMENT'|'OTHER';
  applies_to?: string;
};

type DetailResp = {
  ok: boolean;
  data: PaymentRow;
  applications?: Array<{ id: string; target_type: 'SALE'|'PURCHASE'; target_id: string; amount_usd: number }>;
  journals?: Array<{
    id: string;
    debitAccount?: { id: string; name: string } | null;
    creditAccount?: { id: string; name: string } | null;
    amount_usd: number;
    createdAt: string;
  }>;
};

const money = (v: any, dp=2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<PaymentRow | null>(null);
  const [apps, setApps] = useState<DetailResp['applications']>([]);
  const [journals, setJournals] = useState<DetailResp['journals']>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setErr(''); setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/payments/${id}`, { headers: AUTH });
      const j: DetailResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setRow(j.data);
      setApps(j.applications || []);
      setJournals(j.journals || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setRow(null);
      setApps([]);
      setJournals([]);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Derive kind if backend didn’t supply it
  const derivedKind = useMemo(() => {
    if (!row) return 'General payment';
    if (row.applies_to) return row.applies_to;
    const hasSale   = !!row.sale_id;
    const hasPurch  = !!row.purchase_id;
    const hasCust   = !!row.customer_id;
    const hasSupp   = !!row.supplier_id;
    if (row.direction === 'IN') {
      if (hasSale && hasCust)  return 'Sale at checkout';
      if (!hasSale && hasCust) return 'Receivable payment';
    } else {
      if (hasPurch && hasSupp) return 'Purchase at receiving';
      if (!hasPurch && hasSupp) return 'Payable payment';
    }
    return 'General payment';
  }, [row]);

  return (
    <SafeAreaView style={{ flex:1 }}>
      <Stack.Screen options={{ title: 'Payment' }} />
      {loading ? (
        <View style={s.center}><ActivityIndicator/><Text style={{marginTop:8}}>Loading…</Text></View>
      ) : row ? (
        <View style={s.card}>
          <Text style={s.h1}>Payment {row.id.slice(0,8)}</Text>

          <View style={s.kv}><Text style={s.k}>When</Text><Text style={s.v}>{row.createdAt.slice(0,19).replace('T',' ')}</Text></View>
          <View style={s.kv}><Text style={s.k}>Direction</Text><Text style={s.v}>{row.direction}</Text></View>
          <View style={s.kv}><Text style={s.k}>Method</Text><Text style={s.v}>{row.method}</Text></View>
          <View style={s.kv}><Text style={s.k}>Currency</Text><Text style={s.v}>{row.currency}</Text></View>
          <View style={s.kv}><Text style={s.k}>Amount (USD)</Text><Text style={s.v}>{money(row.amount_usd)}</Text></View>
          {row.amount_native != null ? (
            <View style={s.kv}><Text style={s.k}>Amount (native)</Text><Text style={s.v}>{money(row.amount_native)} {row.currency}</Text></View>
          ) : null}

          <View style={[s.kv, {alignItems:'center'}]}>
            <Text style={s.k}>Applies To</Text>
            <View style={s.badge}><Text style={s.badgeText}>{derivedKind}</Text></View>
          </View>

          {/* Party */}
          {row.Customer ? (
            <View style={s.kv}><Text style={s.k}>Customer</Text><Text style={s.v}>{row.Customer.name}</Text></View>
          ) : row.Supplier ? (
            <View style={s.kv}><Text style={s.k}>Supplier</Text><Text style={s.v}>{row.Supplier.name}</Text></View>
          ) : (
            <View style={s.kv}><Text style={s.k}>Party</Text><Text style={s.v}>(none)</Text></View>
          )}

          {/* Linked source */}
          {row.Sale ? (
            <View style={s.kv}>
              <Text style={s.k}>Sale</Text>
              <Text style={s.v}>{row.Sale.id.slice(0,8)} • {row.Sale.native_currency} • total {money(row.Sale.total_usd)}</Text>
            </View>
          ) : null}
          {row.Purchase ? (
            <View style={s.kv}>
              <Text style={s.k}>Purchase</Text>
              <Text style={s.v}>{row.Purchase.id.slice(0,8)} • total {money(row.Purchase.total_cost_usd)}</Text>
            </View>
          ) : null}

          {/* Applications (optional, if you use them) */}
          {apps && apps.length ? (
            <>
              <View style={s.div}/>
              <Text style={s.h2}>Applications</Text>
              {apps.map(a => (
                <View key={a.id} style={s.kv}>
                  <Text style={s.k}>{a.target_type}</Text>
                  <Text style={s.v}>{a.target_id.slice(0,8)} • {money(a.amount_usd)}</Text>
                </View>
              ))}
            </>
          ) : null}

          {/* Journals */}
          {journals && journals.length ? (
            <>
              <View style={s.div}/>
              <Text style={s.h2}>Journal entries</Text>
              {journals.map(j => (
                <View key={j.id} style={s.kv}>
                  <Text style={s.k}>{j.debitAccount?.name} → {j.creditAccount?.name}</Text>
                  <Text style={s.v}>{money(j.amount_usd)}</Text>
                </View>
              ))}
            </>
          ) : null}

          <View style={s.actions}>
            <TouchableOpacity style={s.btn} onPress={() => Alert.alert('Edit', 'Edit flow coming soon')}>
              <Text style={s.btnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnLight]} onPress={load}>
              <Text style={[s.btnText, {color:'#000'}]}>Reload</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.center}>
          <Text style={{color:'#b00020'}}>⚠️ {err || 'Not found'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center:{flex:1, alignItems:'center', justifyContent:'center'},
  card:{padding:16, gap:8},
  h1:{fontWeight:'800', fontSize:20, marginBottom:6},
  h2:{fontWeight:'800', fontSize:16, marginBottom:4},
  kv:{flexDirection:'row', justifyContent:'space-between', paddingVertical:6},
  k:{fontWeight:'700', color:'#555'},
  v:{fontWeight:'600'},
  div:{height:1, backgroundColor:'#eee', marginVertical:8},
  actions:{flexDirection:'row', gap:12, marginTop:10},
  btn:{backgroundColor:'#000', paddingHorizontal:14, paddingVertical:10, borderRadius:10},
  btnLight:{backgroundColor:'#eee'},
  btnText:{color:'#fff', fontWeight:'800'},
  badge:{backgroundColor:'#eef', paddingHorizontal:10, paddingVertical:6, borderRadius:999},
  badgeText:{fontWeight:'800', color:'#223'},
});