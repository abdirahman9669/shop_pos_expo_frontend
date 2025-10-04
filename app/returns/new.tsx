// app/returns/new.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/** ===== Auth (temp) ===== */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ===== Types ===== */
type Product = { id: string; sku?: string; name: string };
type Customer = { id: string; name: string; phone?: string | null };

type Line = {
  product: Product;
  qty: string;              // input
  unit_price_usd: string;   // input (sell price to reverse)
  unit_cost_usd: string;    // input (COGS to reverse)
};

type RefundMethod = 'CASH_USD' | 'CASH_SOS' | 'AR';
type RefundCurrency = 'USD' | 'SOS';

/** ===== Utils ===== */
const n = (v: any, d = 0) => {
  const x = Number.parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : d;
};
const money = (v: any) => n(v).toFixed(2);

const useDebounce = <T,>(val: T, ms = 250) => {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
};

/** ===== Simple picker modal in-place (search-as-you-type dropdown) ===== */
function SearchPicker<T extends { id: string }>(props: {
  label: string;
  placeholder: string;
  value: T | null;
  onPick: (v: T) => void;
  fetcher: (q: string) => Promise<T[]>;
  display: (v: T) => string;
}) {
  const { label, placeholder, value, onPick, fetcher, display } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 250);
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try { setList(await fetcher(dq)); } catch { setList([]); } finally { setLoading(false); }
  }, [open, dq, fetcher]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ zIndex: 10 }}>
      <Text style={s.label}>{label}</Text>

      {value ? (
        <View style={s.chipRow}>
          <View style={s.chip}>
            <Text style={s.chipTxt}>{display(value)}</Text>
            <TouchableOpacity style={s.xSmall} onPress={() => onPick(null as any)}>
              <Text style={s.xSmallTxt}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!value ? (
        <View>
          <TextInput
            value={q}
            onChangeText={(t) => { setQ(t); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoCapitalize="none"
            style={s.input}
          />
          {open ? (
            <View style={s.dropdown}>
              <View style={s.dropdownHead}>{loading ? <ActivityIndicator /> : <Text style={s.ddHint}>Type to search…</Text>}</View>
              <FlatList
                data={list}
                keyExtractor={(it) => it.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { onPick(item); setQ(''); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={s.ddRow}><Text style={s.ddName} numberOfLines={1}>{display(item)}</Text></View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={s.ddSep} />}
                ListEmptyComponent={!loading ? <Text style={s.ddEmpty}>No results</Text> : null}
                style={{ maxHeight: 260 }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** ===== Main screen ===== */
export default function NewReturn() {
  // Optional links
  const [saleId, setSaleId] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Refund
  const [method, setMethod] = useState<RefundMethod>('CASH_USD');
  const [currency, setCurrency] = useState<RefundCurrency>('USD');
  const [rate, setRate] = useState('27000'); // only for SOS

  // Lines
  const [lines, setLines] = useState<Line[]>([]);

  // Busy/message
  const [busy, setBusy] = useState(false);

  /** --- Fetchers for pickers --- */
  const fetchProducts = useCallback(async (q: string): Promise<Product[]> => {
    const qs = new URLSearchParams({ q: q || '', limit: '25' }).toString();
    const r = await fetch(`${API_BASE}/api/products?${qs}`, { headers: AUTH });
    const j = await r.json();
    const arr: any[] = j?.data ?? j ?? [];
    return arr.map(p => ({ id: p.id, sku: p.sku, name: p.name }));
  }, []);

  const fetchCustomers = useCallback(async (q: string): Promise<Customer[]> => {
    const qs = new URLSearchParams({ q: q || '', limit: '25' }).toString();
    const r = await fetch(`${API_BASE}/api/customers?${qs}`, { headers: AUTH });
    const j = await r.json();
    const arr: any[] = j?.data ?? j ?? [];
    return arr.map(c => ({ id: c.id, name: c.name, phone: c.phone ?? null }));
  }, []);

  /** --- Add a product line helper --- */
  const addProduct = (p: Product) => {
    setLines(prev => [...prev, { product: p, qty: '1', unit_price_usd: '0.00', unit_cost_usd: '0.00' }]);
  };
  const removeLine = (pid: string) => setLines(prev => prev.filter(l => l.product.id !== pid));

  const totalUsd = useMemo(
    () => lines.reduce((s, l) => s + n(l.qty, 0) * n(l.unit_price_usd, 0), 0),
    [lines]
  );

  /** --- Submit --- */
  const canSubmit = useMemo(() => {
    if (lines.length === 0) return false;
    if (currency === 'SOS' && n(rate, 0) <= 0) return false;
    for (const l of lines) {
      if (!l.product?.id) return false;
      if (n(l.qty, 0) <= 0) return false;
      if (!Number.isFinite(n(l.unit_price_usd))) return false;
      if (!Number.isFinite(n(l.unit_cost_usd))) return false;
    }
    return true;
  }, [lines, currency, rate]);

  const submit = useCallback(async () => {
    if (!canSubmit) { Alert.alert('Check form', 'Fill all required fields'); return; }
    setBusy(true);
    try {
      const body = {
        sale_id: saleId.trim() || null,
        customer_id: customer?.id || null,
        lines: lines.map(l => ({
          product_id: l.product.id,
          qty: n(l.qty, 0),
          unit_price_usd: n(l.unit_price_usd, 0),
          unit_cost_usd: n(l.unit_cost_usd, 0),
        })),
        refund: {
          method,
          currency,
          ...(currency === 'SOS' ? { rate_used: n(rate, 0) } : {}),
        },
      };

      const r = await fetch(`${API_BASE}/api/returns`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify(body),
      });
      const txt = await r.text();
      let j: any = {};
      try { j = JSON.parse(txt); } catch { /* HTML error pages */ }

      if (!r.ok || !j?.ok) {
        const msg = j?.error || `HTTP ${r.status}`;
        throw new Error(msg);
      }

      Alert.alert(
        '✅ Return created',
        `Return #${j.return_id}\nTotal (USD): ${money(j?.totals?.total_usd)}`,
      );
      // reset
      setSaleId('');
      setCustomer(null);
      setLines([]);
    } catch (e: any) {
      Alert.alert('Create return failed', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, [saleId, customer, lines, method, currency, rate, canSubmit]);

  /** --- UI --- */
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New Return' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={lines}
          keyExtractor={(l) => l.product.id}
          ListHeaderComponent={
            <View style={{ padding: 16, gap: 14 }}>
              <Text style={s.title}>Create Return</Text>

              <Text style={s.label}>Sale ID (optional)</Text>
              <TextInput
                value={saleId}
                onChangeText={setSaleId}
                placeholder="Link original sale…"
                style={s.input}
                autoCapitalize="none"
              />

              <SearchPicker<Customer>
                label="Customer (optional)"
                placeholder="Search customer…"
                value={customer}
                onPick={setCustomer}
                fetcher={fetchCustomers}
                display={(c) => c.name + (c.phone ? ` — ${c.phone}` : '')}
              />

              {/* Refund */}
              <Text style={s.label}>Refund method</Text>
              <View style={s.segment}>
                {(['CASH_USD','CASH_SOS','AR'] as RefundMethod[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => { setMethod(m); setCurrency(m === 'CASH_SOS' ? 'SOS' : 'USD'); }}
                    style={[s.segBtn, method === m ? s.segOn : s.segOff]}
                  >
                    <Text style={[s.segTxt, method === m ? s.segTxtOn : s.segTxtOff]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Currency</Text>
              <View style={s.segment}>
                {(['USD','SOS'] as RefundCurrency[]).map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[s.segBtnSmall, currency === c ? s.segOn : s.segOff]}
                  >
                    <Text style={[s.segTxt, currency === c ? s.segTxtOn : s.segTxtOff]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {currency === 'SOS' ? (
                <>
                  <Text style={s.label}>Rate used (SOS per 1 USD)</Text>
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="number-pad"
                    style={s.input}
                    placeholder="27000"
                  />
                </>
              ) : null}

              {/* Add product */}
              <SearchPicker<Product>
                label="Add product"
                placeholder="Search product to return…"
                value={null}
                onPick={(p) => addProduct(p)}
                fetcher={fetchProducts}
                display={(p) => (p.sku ? `${p.sku} · ` : '') + p.name}
              />
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.lineCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={s.lineTitle} numberOfLines={1}>{item.product.name}</Text>
                <TouchableOpacity onPress={() => removeLine(item.product.id)} style={s.xBtn}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={s.row3}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sub}>Qty</Text>
                  <TextInput
                    value={item.qty}
                    onChangeText={(t) => setLines(prev => prev.map(l => l.product.id === item.product.id ? { ...l, qty: t } : l))}
                    keyboardType="number-pad"
                    style={s.input}
                    placeholder="1"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sub}>Unit price (USD)</Text>
                  <TextInput
                    value={item.unit_price_usd}
                    onChangeText={(t) => setLines(prev => prev.map(l => l.product.id === item.product.id ? { ...l, unit_price_usd: t } : l))}
                    keyboardType="decimal-pad"
                    style={s.input}
                    placeholder="0.00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sub}>Unit cost (USD)</Text>
                  <TextInput
                    value={item.unit_cost_usd}
                    onChangeText={(t) => setLines(prev => prev.map(l => l.product.id === item.product.id ? { ...l, unit_cost_usd: t } : l))}
                    keyboardType="decimal-pad"
                    style={s.input}
                    placeholder="0.00"
                  />
                </View>
              </View>
              <Text style={{ marginTop: 6, fontWeight: '700', textAlign: 'right' }}>
                Line total: {money(n(item.qty,0)*n(item.unit_price_usd,0))} USD
              </Text>
            </View>
          )}
          ListFooterComponent={
            <View style={{ padding: 16, gap: 10 }}>
              <Text style={{ fontWeight: '800', textAlign: 'right' }}>Total (USD): {money(totalUsd)}</Text>
              <TouchableOpacity
                onPress={submit}
                disabled={!canSubmit || busy}
                style={[s.submit, (!canSubmit || busy) && { opacity: 0.5 }]}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Create Return</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** ===== Styles ===== */
const s = StyleSheet.create({
  title: { fontWeight: '800', fontSize: 20 },

  label: { fontWeight: '700' },
  sub: { fontWeight: '600', color: '#555', marginBottom: 6 },

  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },

  segment: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  segBtnSmall: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  segOn: { backgroundColor: '#000' },
  segOff: { backgroundColor: '#eaeaea' },
  segTxt: { fontWeight: '800' },
  segTxtOn: { color: '#fff' },
  segTxtOff: { color: '#333' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { flexDirection: 'row', backgroundColor: '#000', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center' },
  chipTxt: { color: '#fff', fontWeight: '800' },
  xSmall: { marginLeft: 8, backgroundColor: '#fff', borderRadius: 999, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  xSmallTxt: { fontSize: 12, fontWeight: '900', color: '#000', lineHeight: 16 },

  dropdown: {
    position: 'absolute', top: 52, left: 0, right: 0,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee',
    borderRadius: 10, overflow: 'hidden', zIndex: 20, elevation: 8
  },
  dropdownHead: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  ddHint: { color: '#666', fontWeight: '700' },
  ddRow: { paddingHorizontal: 12, paddingVertical: 12 },
  ddName: { fontWeight: '700' },
  ddSep: { height: 1, backgroundColor: '#f3f3f3' },
  ddEmpty: { padding: 12, color: '#666' },

  row3: { flexDirection: 'row', gap: 10 },

  lineCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee', marginHorizontal: 16, marginBottom: 12 },
  lineTitle: { fontWeight: '800', flex: 1, marginRight: 8 },

  xBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  submit: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  submitTxt: { color: '#fff', fontWeight: '800' },
});