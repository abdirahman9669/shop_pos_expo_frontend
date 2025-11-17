// app/payments/new.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  FlatList, Platform, Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native';
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

/** ====== TEMP AUTH (move later) ====== */


/** ====== Types ====== */
type Direction = 'IN' | 'OUT';
type Currency = { id: string; code: 'USD' | 'SOS'; name?: string };
type PartyBase = { id: string; name: string; phone: string | null };
type CustomerParty = PartyBase & { kind: 'customer'; balance_usd: number };
type SupplierParty = PartyBase & { kind: 'supplier' };
type Party = CustomerParty | SupplierParty;
type Account = { id: string; name: string; AccountType?: { name: string } };

type CreateResp = { ok: boolean; payment?: { id: string }; error?: string };

/** ====== Utils ====== */
const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const useDebounce = <T,>(value: T, delay = 250) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDeb(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return deb;
};

/** ====== Screen ====== */
export default function NewPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Form
  const [direction, setDirection] = useState<Direction>('IN');
  const [currency, setCurrency] = useState<Currency>({ id: 'USD', code: 'USD' });
  const [amountUsd, setAmountUsd] = useState('');
  const [amountNative, setAmountNative] = useState('');

  // Methods (derived from Accounts)
  const [methods, setMethods] = useState<string[]>([]);
  const [method, setMethod] = useState<string>('CASH_USD');

  // Party search & selection
  const [partyQuery, setPartyQuery] = useState('');
  const debQuery = useDebounce(partyQuery, 200);
  const [showSugs, setShowSugs] = useState(false);
  const [suggestions, setSuggestions] = useState<Party[]>([]);
  const [loadingSugs, setLoadingSugs] = useState(false);
  const [selected, setSelected] = useState<Party | null>(null);
  const partyInputRef = useRef<TextInput>(null);

  /** ---- Backend fetchers ---- */
  const loadCurrencies = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/currencies`, { headers: await authHeaders() });
      const j = await r.json();
      const arr: any[] = j?.currencies ?? j ?? [{ code: 'USD' }, { code: 'SOS' }];
      const mapped = arr.map((c) => ({ id: c.code, code: c.code }));
      // default to USD if present
      const def = mapped.find((x) => x.code === 'USD') ?? mapped[0] ?? { id: 'USD', code: 'USD' };
      setCurrency(def);
    } catch {
      setCurrency({ id: 'USD', code: 'USD' });
    }
  }, []);

  const loadMethodsFromAccounts = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/accounts?limit=200`, { headers: await authHeaders() });
      const j = await r.json();
      const list: Account[] = (j?.data ?? j ?? []) as Account[];
      // Strategy: anything named CASH_*, WALLET_*, BANK_* or AccountType CASH_ON_HAND
      const names = list
        .filter(a =>
          /^(CASH_|WALLET_|BANK_)/i.test(a.name) ||
          a.AccountType?.name === 'CASH_ON_HAND'
        )
        .map(a => a.name.toUpperCase())
        .filter((v, i, arr) => arr.indexOf(v) === i) // unique
        .sort();
      setMethods(names.length ? names : ['CASH_USD', 'CASH_SOS']);
      if (names.length) setMethod(names.find(n => /USD/i.test(n)) ?? names[0]);
    } catch {
      setMethods(['CASH_USD', 'CASH_SOS']);
      setMethod('CASH_USD');
    }
  }, []);

  const fetchCustomersAllWithBalance = useCallback(async (): Promise<CustomerParty[]> => {
    const r = await fetch(`${API_BASE}/api/customers/allWithBalance?limit=1000`, { headers: await authHeaders() });
    const j = await r.json();
    const rows: any[] = j?.rows || j?.data || j || [];
    return rows.map((x) => ({
      kind: 'customer' as const,
      id: String(x.customer_id ?? x.id),
      name: String(x.customer_name ?? x.name ?? '').trim() || '(Unnamed customer)',
      phone: (x.customer_phone ?? x.phone ?? '') || null,
      balance_usd: Number(x.balance_usd ?? x.balance ?? 0) || 0,
    }));
  }, []);

  const fetchSuppliers = useCallback(async (q: string): Promise<SupplierParty[]> => {
    const qs = new URLSearchParams({ q, limit: '8', order: 'name', dir: 'ASC' }).toString();
    const r = await fetch(`${API_BASE}/api/suppliers?${qs}`, { headers: await authHeaders() });
    const j = await r.json();
    const rows: any[] = j?.data || j?.rows || j || [];
    return rows.map((x) => ({
      kind: 'supplier' as const,
      id: String(x.supplier_id ?? x.id),
      name: String(x.supplier_name ?? x.name ?? '').trim() || '(Unnamed supplier)',
      phone: (x.supplier_phone ?? x.phone ?? '') || null,
    }));
  }, []);

  /** ---- Init methods & currencies ---- */
  useEffect(() => { loadCurrencies(); loadMethodsFromAccounts(); }, [loadCurrencies, loadMethodsFromAccounts]);

  /** ---- Suggestions: only when focused ---- */
  useEffect(() => {
    if (!showSugs) return; // do nothing until input is focused
    let cancelled = false;
    (async () => {
      setLoadingSugs(true);
      try {
        let list: Party[] = [];
        if (direction === 'IN') {
          // customers: fetch all then filter locally
          const all = await fetchCustomersAllWithBalance();
          const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
          const q = debQuery.trim().toLowerCase();
          list = q
            ? sorted.filter(p => (`${p.name} ${p.phone ?? ''}`).toLowerCase().includes(q))
            : sorted.slice(0, 8); // first 8 A→Z on focus with empty query
        } else {
          // suppliers: server-side search; if empty query show first 8 by A→Z
          const sup = await fetchSuppliers(debQuery);
          const sorted = [...sup].sort((a, b) => a.name.localeCompare(b.name));
          list = debQuery.trim() ? sorted : sorted.slice(0, 8);
        }
        if (!cancelled) setSuggestions(list);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSugs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showSugs, direction, debQuery, fetchCustomersAllWithBalance, fetchSuppliers]);

  // Reset selection when switching direction
  useEffect(() => { setSelected(null); setPartyQuery(''); setShowSugs(false); }, [direction]);

  /** ---- Submit ---- */
  const canSubmit = useMemo(() => {
    const amtOk = Number(amountUsd) > 0;
    return !!selected && !!method && !!currency?.code && amtOk;
  }, [selected, method, currency, amountUsd]);

  const submit = useCallback(async () => {
    if (!canSubmit || !selected) return;
    const body: any = {
      direction,
      method,
      currency: currency.code,
      amount_usd: Number(amountUsd),
    };
    if (amountNative) body.amount_native = Number(amountNative);
    if (selected.kind === 'customer') body.customer_id = selected.id;
    else body.supplier_id = selected.id;

    try {
      const r = await fetch(`${API_BASE}/api/payments`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
      const j: CreateResp = await r.json();
      if (!r.ok || !j?.ok || !j?.payment?.id) throw new Error(j?.error || `HTTP ${r.status}`);
      router.push({ pathname: '/payments/[id]' as const, params: { id: j.payment.id } });
    } catch (e: any) {
      alert(e?.message || 'Failed to create payment');
    }
  }, [canSubmit, selected, direction, method, currency, amountUsd, amountNative, router]);

  /** ---- UI helpers ---- */
  const pick = (p: Party) => { setSelected(p); setPartyQuery(''); setShowSugs(false); Keyboard.dismiss(); };
  const clearSelected = () => { setSelected(null); setTimeout(() => partyInputRef.current?.focus(), 0); };

  /** ---- Renders ---- */
  const renderSuggestion = ({ item }: { item: Party }) => (
    <TouchableOpacity onPress={() => pick(item)} activeOpacity={0.7}>
      <View style={s.sugRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.sugName} numberOfLines={1}>{item.name}</Text>
          {item.phone ? <Text style={s.sugSub} numberOfLines={1}>{item.phone}</Text> : null}
        </View>
        {'balance_usd' in item ? <Text style={s.sugBal}>{money(item.balance_usd)}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New Payment' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 8 + insets.top, android: 0 })}
      >
        <FlatList
          data={[]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
          ListHeaderComponent={
            <View style={{ gap: 14 }}>
              {/* Direction */}
              <View>
                <Text style={s.label}>Direction</Text>
                <View style={s.segment}>
                  <TouchableOpacity
                    style={[s.segBtn, direction === 'IN' ? s.segOn : s.segOff]}
                    onPress={() => setDirection('IN')}
                  >
                    <Text style={[s.segTxt, direction === 'IN' ? s.segTxtOn : s.segTxtOff]}>IN (Customer)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.segBtn, direction === 'OUT' ? s.segOn : s.segOff]}
                    onPress={() => setDirection('OUT')}
                  >
                    <Text style={[s.segTxt, direction === 'OUT' ? s.segTxtOn : s.segTxtOff]}>OUT (Supplier)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Party */}
              <View>
                <Text style={s.label}>{direction === 'IN' ? 'Customer' : 'Supplier'}</Text>

                {selected ? (
                  <View style={s.chip}>
                    <Text style={s.chipTxt} numberOfLines={1}>
                      {selected.name}
                      {selected.phone ? ` • ${selected.phone}` : ''}
                      {'balance_usd' in selected ? ` • ${money(selected.balance_usd)}` : ''}
                    </Text>
                    <TouchableOpacity onPress={clearSelected} style={s.xBtn}><Text style={s.xTxt}>×</Text></TouchableOpacity>
                  </View>
                ) : null}

                {!selected ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      ref={partyInputRef}
                      style={s.input}
                      placeholder={`Search ${direction === 'IN' ? 'customer' : 'supplier'}…`}
                      value={partyQuery}
                      onChangeText={setPartyQuery}
                      onFocus={() => setShowSugs(true)}   // <-- only show 8 when focused
                      onBlur={() => { /* keep open if needed; we close on pick */ }}
                      autoCapitalize="none"
                      returnKeyType="done"
                    />
                    {showSugs ? (
                      <View style={s.card}>
                        <View style={s.cardHead}>
                          <Text style={s.cardTitle}>{direction === 'IN' ? 'Customers' : 'Suppliers'}</Text>
                          {loadingSugs ? <ActivityIndicator /> : null}
                        </View>
                        {(!suggestions || suggestions.length === 0) && !loadingSugs ? (
                          <Text style={s.empty}>No matches</Text>
                        ) : (
                          <FlatList
                            data={suggestions}
                            keyExtractor={(it) => it.id}
                            renderItem={renderSuggestion}
                            ItemSeparatorComponent={() => <View style={s.sep} />}
                            keyboardShouldPersistTaps="handled"
                            style={{ maxHeight: 280 }}
                          />
                        )}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* Method – fetched from Accounts */}
              <View>
                <Text style={s.label}>Method</Text>
                <View style={s.segmentWrap}>
                  {methods.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[s.segBtnSmall, method === m ? s.segOn : s.segOff]}
                      onPress={() => setMethod(m)}
                    >
                      <Text style={[s.segTxt, method === m ? s.segTxtOn : s.segTxtOff]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Currency – fetched */}
              <View>
                <Text style={s.label}>Currency</Text>
                <View style={s.segmentWrap}>
                  {(['USD','SOS'] as const).map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[s.segBtnSmall, currency.code === code ? s.segOn : s.segOff]}
                      onPress={() => setCurrency({ id: code, code })}
                    >
                      <Text style={[s.segTxt, currency.code === code ? s.segTxtOn : s.segTxtOff]}>{code}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amounts */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Amount (USD)</Text>
                  <TextInput
                    style={s.input}
                    value={amountUsd}
                    onChangeText={setAmountUsd}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Amount (native)</Text>
                  <TextInput
                    style={s.input}
                    value={amountNative}
                    onChangeText={setAmountNative}
                    keyboardType="decimal-pad"
                    placeholder={currency.code === 'SOS' ? 'e.g., 27000' : 'optional'}
                  />
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity disabled={!canSubmit} onPress={submit} style={[s.submit, !canSubmit && { opacity: 0.5 }]}>
                <Text style={s.submitTxt}>Create Payment {selected ? `for ${selected.name}` : ''}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={() => null}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** ====== Styles ====== */
const s = StyleSheet.create({
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  // Segments
  segment: { flexDirection: 'row', gap: 8 },
  segmentWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  segBtnSmall: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  segOn: { backgroundColor: '#000' },
  segOff: { backgroundColor: '#eaeaea' },
  segTxt: { fontWeight: '800' },
  segTxtOn: { color: '#fff' },
  segTxtOff: { color: '#333' },

  // Chip
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#000', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 6 },
  chipTxt: { color: '#fff', fontWeight: '800', flexShrink: 1 },
  xBtn: { backgroundColor: '#fff', borderRadius: 999, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  xTxt: { fontWeight: '900', fontSize: 12, color: '#000', lineHeight: 16 },

  // Inline dropdown (stays above keyboard)
  card: { borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden' },
  cardHead: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f1f1', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '800', color: '#333' },
  empty: { padding: 12, color: '#666' },

  // Suggestion list
  sugRow: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sugName: { fontWeight: '700' },
  sugSub: { color: '#666', fontSize: 12, marginTop: 2 },
  sugBal: { marginLeft: 8, fontVariant: ['tabular-nums'], fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#f3f3f3' },

  // Submit
  submit: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  submitTxt: { color: '#fff', fontWeight: '800' },
});