// app/new-sale.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, FlatList, Modal, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE, TOKEN } from '@/src/config';

/** ===========================
 *  CONFIG / ENDPOINTS / TOKEN
 *  =========================== */

const URLS = {
  products: `${API_BASE}/api/products`,
  byBar: `${API_BASE}/api/products/byBar`,
  devices: `${API_BASE}/api/devices`,
  sessions: `${API_BASE}/api/cash-sessions`,
  stores: `${API_BASE}/api/stores`,
  customers: `${API_BASE}/api/customers`,
  accounts: `${API_BASE}/api/accounts?limit=200`,
  sales: `${API_BASE}/api/sales`,
  rates: `${API_BASE}/api/exchange-rates?limit=1&order=as_of_date&dir=DESC`,
};

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** =========
 *  TYPES
 *  ========= */
type Product = { id: string; sku: string; name: string; unit?: string; price_usd?: string | number };
type Device = { id: string; label?: string; name?: string };
type CashSession = { id: string; device_id: string; opened_at: string; closed_at: string | null };
type Store = { id: string; name: string; type?: string };
type Customer = { id: string; name: string; phone?: string | null };
type Account = { id: string; name: string; AccountType?: { name: string } };
type Line = { product_id: string; name: string; qty: number; unit_price_usd: number };
type Rate = { accounting: number; sell: number; buy: number };

/** =========
 *  UTILS
 *  ========= */
const n = (v: any, d = 0) => {
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : d;
};
const money = (v: any) => n(v, 0).toFixed(2);
const labelOfDevice = (d: Device) => d.label || d.name || d.id;

/** =========
 *  MAIN SCREEN
 *  ========= */
export default function NewSale() {
  // Top selectors
  const [device, setDevice] = useState<Device | null>(null);
  const [session, setSession] = useState<CashSession | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  // Customer (search box with popup)
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);

  // Lines
  const [lines, setLines] = useState<Line[]>([]);

  // Payments — one input for USD, one input for SOS (native)
  const [usdAmount, setUsdAmount] = useState('');   // USD cash
  const [sosNative, setSosNative] = useState('');   // SOS cash (native)

  // FX rate
  const [rate, setRate] = useState<Rate>({ accounting: 27000, sell: 27000, buy: 28000 });
  const [rateLoading, setRateLoading] = useState(false);

  // Product search/scan
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Scan feedback banner
  const [lastAdded, setLastAdded] = useState<{ name: string; qty: number } | null>(null);
  const feedbackTimerRef = useRef<any>(null);

  // Busy / msg
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  /** ---------- Fetchers ---------- */
  const fetchDevices = useCallback(async (): Promise<Device[]> => {
    const r = await fetch(URLS.devices, { headers: AUTH }); const j = await r.json();
    return (j?.data ?? j ?? []).map((x: any) => ({ id: x.id, label: x.label, name: x.name }));
  }, []);

  const fetchSessions = useCallback(async (): Promise<CashSession[]> => {
    const r = await fetch(URLS.sessions, { headers: AUTH }); const j = await r.json();
    return (j?.data ?? j ?? []).filter((x: any) => !x.closed_at);
  }, []);

  const fetchStores = useCallback(async (): Promise<Store[]> => {
    const r = await fetch(URLS.stores, { headers: AUTH }); const j = await r.json();
    return (j?.data ?? j ?? j);
  }, []);

  const fetchAccounts = useCallback(async (): Promise<Account[]> => {
    const r = await fetch(URLS.accounts, { headers: AUTH }); const j = await r.json();
    return (j?.data ?? j ?? []);
  }, []);

  const fetchCustomers = useCallback(async (q: string): Promise<Customer[]> => {
    const params = new URLSearchParams({ limit: '10', ...(q ? { q } : {}) });
    const r = await fetch(`${URLS.customers}?${params.toString()}`, { headers: AUTH });
    const j = await r.json();
    return (j?.data ?? j ?? []);
  }, []);

  const fetchLatestRate = useCallback(async (): Promise<Rate> => {
    setRateLoading(true);
    try {
      const r = await fetch(URLS.rates, { headers: AUTH });
      const j = await r.json();
      const row = (j?.data ?? [])[0];
      if (!row) return { accounting: 27000, sell: 27000, buy: 28000 };
      return {
        accounting: Number(row.rate_accounting || 27000),
        sell: Number(row.rate_sell_usd_to_sos || 27000),
        buy: Number(row.rate_buy_usd_with_sos || 28000),
      };
    } catch {
      return { accounting: 27000, sell: 27000, buy: 28000 };
    } finally {
      setRateLoading(false);
    }
  }, []);

  /** Defaults + rate */
  useEffect(() => {
    (async () => {
      try {
        const [devs, sess, sts, latest] = await Promise.all([
          fetchDevices(), fetchSessions(), fetchStores(), fetchLatestRate()
        ]);
        setRate(latest);

        if (!device && devs[0]) setDevice(devs[0]);
        if (!session && sess[0]) setSession(sess[0]);

        if (!store) {
          const primary = sts.find((s: any) => /primary/i.test(s.name));
          setStore(primary ?? sts[0] ?? null);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------- Customer popup (type≥1 char) ---------- */
  useEffect(() => {
    let alive = true;
    const doSearch = async () => {
      if (!customerOpen || customerQuery.trim().length < 1) { setCustomerResults([]); return; }
      setCustomerLoading(true);
      try {
        const rows = await fetchCustomers(customerQuery.trim());
        if (!alive) return;
        setCustomerResults(rows.slice(0, 8));
      } catch {
        if (alive) setCustomerResults([]);
      } finally {
        if (alive) setCustomerLoading(false);
      }
    };
    const t = setTimeout(doSearch, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [customerOpen, customerQuery, fetchCustomers]);

  /** ---------- Product search (debounced) ---------- */
  const debounceRef = useRef<any>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const qs = new URLSearchParams({ q: query.trim(), limit: '25' });
        const r = await fetch(`${URLS.products}?${qs.toString()}`, { headers: AUTH });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setResults(Array.isArray(j) ? j : (j.data ?? []));
      } catch (e: any) {
        Alert.alert('Search error', e?.message || 'Failed to search');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  /** ---------- Scan ---------- */
  const [permissionAsked, setPermissionAsked] = useState(false);
  useEffect(() => { if (scanOpen && !permission?.granted && !permissionAsked) { setPermissionAsked(true); requestPermission(); } }, [scanOpen, permission?.granted, permissionAsked, requestPermission]);

  const lastHandledByCodeRef = useRef(new Map<string, number>());
  const handlingRef = useRef(false);

  const addLineAndGetNewQty = useCallback((p: Product): number => {
    let newQty = 1;
    setLines(prev => {
      const idx = prev.findIndex(l => l.product_id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        const q = Math.max(1, (copy[idx].qty || 0) + 1);
        copy[idx] = { ...copy[idx], qty: q };
        newQty = q;
        return copy;
      }
      const price = typeof p.price_usd === 'string' ? n(p.price_usd, 0) : n(p.price_usd, 0);
      newQty = 1;
      return [...prev, { product_id: p.id, name: p.name || p.sku, qty: 1, unit_price_usd: price }];
    });
    return newQty;
  }, []);

  const onScanned = useCallback(async (e: { data: string }) => {
    const code = String(e.data || '').trim();
    if (!code) return;

    if (handlingRef.current) return;
    handlingRef.current = true;

    const now = Date.now();
    const lastForCode = lastHandledByCodeRef.current.get(code) || 0;
    if (now - lastForCode < 800) { handlingRef.current = false; return; }
    lastHandledByCodeRef.current.set(code, now);

    try {
      const r = await fetch(`${URLS.byBar}?barcode=${encodeURIComponent(code)}`, { headers: AUTH });
      if (!r.ok) {
        if (r.status === 404) { Alert.alert('Not found', `No product for barcode ${code}`); return; }
        throw new Error(`HTTP ${r.status}`);
      }
      const j = await r.json();
      const p: Product | null =
        (j && j.id && j.sku) ? j :
        (j?.product?.id ? j.product : (Array.isArray(j?.data) ? j.data[0] : j?.data?.id ? j.data : null));
      if (!p) { Alert.alert('Not found', `No product for barcode ${code}`); return; }

      const qty = addLineAndGetNewQty(p);
      setLastAdded({ name: p.name || p.sku, qty });
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setLastAdded(null), 1400);
    } catch (err: any) {
      Alert.alert('Scan lookup failed', err?.message || 'Could not fetch product');
    } finally {
      handlingRef.current = false;
    }
  }, [addLineAndGetNewQty]);

  /** ---------- Lines edits ---------- */
  const setQty = (id: string, v: string) =>
    setLines(prev =>
      prev.map(l =>
        l.product_id === id ? { ...l, qty: Math.max(1, Math.floor(Number(v || '1'))) } : l
      )
    );

  const setPrice = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, unit_price_usd: Math.max(0, n(v, 0)) } : l));

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.product_id !== id));

  /** ---------- Totals & Remaining ---------- */
  const totalUsd = useMemo(
    () => lines.reduce((s, l) => s + (l.qty * l.unit_price_usd), 0),
    [lines]
  );
  const totalSos = useMemo(() => Math.round(n(totalUsd * (rate.sell || 27000), 0)), [totalUsd, rate.sell]);

  const paidUsd = useMemo(() => n(usdAmount, 0) + (n(sosNative, 0) > 0 ? (n(sosNative, 0) / (rate.sell || 27000)) : 0), [usdAmount, sosNative, rate.sell]);
  const remUsd = useMemo(() => Math.max(0, n(totalUsd - paidUsd, 0)), [totalUsd, paidUsd]);
  const remSos = useMemo(() => Math.round(remUsd * (rate.sell || 27000)), [remUsd, rate.sell]);

  /** ---------- Submit ---------- */
  const submit = useCallback(async () => {
    setMsg('');
    if (!device || !session || !store) return setMsg('Select device, session, and store.');
    if (!customer) return setMsg('Pick a customer.');
    if (lines.length === 0) return setMsg('Add at least one product line.');

    const payments: any[] = [];
    if (n(usdAmount, 0) > 0) payments.push({ method: 'CASH_USD', amount_usd: n(usdAmount, 0) });
    if (n(sosNative, 0) > 0) payments.push({ method: 'CASH_SOS', amount_native: n(sosNative, 0), rate_used: rate.sell || 27000 });

    setBusy(true);
    try {
      const body = {
        device_id: device.id,
        cash_session_id: session.id,
        store_id: store.id,
        customer_id: customer.id,
        lines: lines.map(l => ({ product_id: l.product_id, qty: l.qty, unit_price_usd: l.unit_price_usd })),
        payments, // multi-pay (USD + SOS native)
        status: 'COMPLETED',
      };

      const r = await fetch(URLS.sales, { method: 'POST', headers: AUTH, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      Alert.alert('✅ Sale created', j?.sale?.id || j?.sale_id || 'OK');

      // reset minimal
      setLines([]);
      setUsdAmount('');
      setSosNative('');
      setCustomer(null);
      setCustomerQuery('');
      setCustomerOpen(false);
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Failed to create sale'}`);
    } finally {
      setBusy(false);
    }
  }, [device, session, store, customer, lines, usdAmount, sosNative, rate.sell]);

  /** =========
   *  RENDER
   *  ========= */
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => '_'}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={s.wrap}>
              <Text style={s.title}>New Sale</Text>
              {msg ? <Text style={s.notice}>{msg}</Text> : null}

              {/* Device / Session / Store */}
              <Picker
                label="Device"
                value={device?.id ? (device.label || device.name || device.id) : ''}
                onOpen={async (setList) => setList(await (await fetch(URLS.devices, { headers: AUTH })).json().then((j:any)=>j?.data??j??[]))}
                onPick={(v:any)=>{ setDevice(v); setSession(null); }}
              />
              <Picker
                label="Cash Session"
                value={session?.opened_at ? new Date(session.opened_at).toLocaleString() : ''}
                onOpen={async (setList) => {
                  const j = await (await fetch(URLS.sessions, { headers: AUTH })).json();
                  const arr = (j?.data ?? j ?? []).filter((x:any)=>!x.closed_at);
                  setList(device ? arr.filter((s:any)=>s.device_id===device.id) : arr);
                }}
                onPick={setSession}
              />
              <Picker
                label="Store"
                value={store?.name || ''}
                onOpen={async (setList) => {
                  const j = await (await fetch(URLS.stores, { headers: AUTH })).json();
                  setList(j?.data ?? j ?? []);
                }}
                onPick={setStore}
              />

              {/* Customer search box with popup */}
              <Text style={s.label}>Customer</Text>
              <TextInput
                value={customer ? customer.name : customerQuery}
                onChangeText={(t) => {
                  setCustomer(null);
                  setCustomerQuery(t);
                  setCustomerOpen(t.trim().length >= 1);
                }}
                onFocus={() => setCustomerOpen(customerQuery.trim().length >= 1)}
                placeholder="Type customer name/phone…"
                style={s.input}
              />
              {customerOpen && (
                <View style={s.customerPopup}>
                  {customerLoading ? (
                    <View style={{ padding: 10 }}><ActivityIndicator /></View>
                  ) : customerResults.length ? (
                    customerResults.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={s.customerItem}
                        onPress={() => { setCustomer(c); setCustomerOpen(false); setCustomerQuery(''); }}
                      >
                        <Text style={{ fontWeight: '800' }}>{c.name}</Text>
                        {c.phone ? <Text style={{ color: '#666' }}>{c.phone}</Text> : null}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ padding: 10, color: '#777' }}>No matches</Text>
                  )}
                </View>
              )}

              {/* Payments — one input for USD, one input for SOS */}
              <Text style={[s.label, { marginTop: 12 }]}>Payments</Text>

              {/* USD */}
              <View style={s.payRow}>
                <Text style={{ fontWeight: '800', marginBottom: 6 }}>Cash (USD)</Text>
                <Text style={s.subLabel}>Amount (USD)</Text>
                <TextInput
                  value={usdAmount}
                  onChangeText={setUsdAmount}
                  keyboardType="decimal-pad"
                  style={s.input}
                  placeholder="0.00"
                />
              </View>

              {/* SOS */}
              <View style={s.payRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', marginBottom: 6 }}>Cash (SOS)</Text>
                  <TouchableOpacity
                    onPress={async () => setRate(await fetchLatestRate())}
                    style={[s.tagBtn, { paddingVertical: 6 }]}
                  >
                    <Text style={s.tagTxt}>{rateLoading ? 'Rate…' : 'Refresh rate'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.subLabel}>Amount (SOS)</Text>
                <TextInput
                  value={sosNative}
                  onChangeText={setSosNative}
                  keyboardType="number-pad"
                  style={s.input}
                  placeholder="0"
                />
                <Text style={{ color: '#666', marginTop: 6 }}>
                  Using sell rate: <Text style={{ fontWeight: '800' }}>{rate.sell}</Text>  →  USD eq: <Text style={{ fontWeight: '800' }}>
                    { (n(sosNative,0) / (rate.sell || 27000)).toFixed(2) }
                  </Text>
                </Text>
              </View>

              {/* Totals */}
              <View style={{ marginTop: 12 }}>
                <Text>
                  Total USD: <Text style={{ fontWeight: '800' }}>{totalUsd.toFixed(2)}</Text>
                  {'   '}Total SOS: <Text style={{ fontWeight: '800' }}>{totalSos.toLocaleString()}</Text>
                </Text>
                <Text style={{ marginTop: 4 }}>
                  Paid USD: <Text style={{ fontWeight: '800' }}>{paidUsd.toFixed(2)}</Text>
                  {'   '}Paid SOS(eq): <Text style={{ fontWeight: '800' }}>{Math.round(paidUsd * (rate.sell || 27000)).toLocaleString()}</Text>
                </Text>
                <Text style={{ marginTop: 4, fontWeight: '800' }}>
                  Remaining USD: {remUsd.toFixed(2)}   |   Remaining SOS: {remSos.toLocaleString()}
                </Text>
              </View>

              {/* Product search + scan */}
              <View style={[s.topRow, { marginTop: 16 }]}>
                <TextInput
                  style={s.search}
                  placeholder="Search products by name or SKU…"
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={s.scanBtn} onPress={() => setScanOpen(true)}>
                  <Text style={s.scanText}>Scan</Text>
                </TouchableOpacity>
              </View>

              {/* Results */}
              {searching ? (
                <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Searching…</Text></View>
              ) : results.length ? (
                <>
                  <View style={[s.row, s.headerRow]}>
                    <Text style={[s.cell, s.colSku, s.headerText]}>sku</Text>
                    <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
                    <Text style={[s.cell, s.colUnit, s.headerText]}>unit</Text>
                    <Text style={[s.cell, s.colPrice, s.headerText]}>price_usd</Text>
                    <Text style={[s.cell, s.colAct, s.headerText]}>action</Text>
                  </View>
                  {results.map(item => {
                    const price = typeof item.price_usd === 'string' ? item.price_usd : money(item.price_usd);
                    return (
                      <View key={item.id} style={[s.row, s.dataRow]}>
                        <Text style={[s.cell, s.colSku]} numberOfLines={1}>{item.sku}</Text>
                        <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[s.cell, s.colUnit]} numberOfLines={1}>{item.unit ?? ''}</Text>
                        <Text style={[s.cell, s.colPrice]} numberOfLines={1}>{price}</Text>
                        <View style={[s.cell, s.colAct]}>
                          <TouchableOpacity
                            style={[s.actBtn, s.addBtn]}
                            onPress={() => addLineAndGetNewQty(item)}
                          >
                            <Text style={s.actBtnText}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : (
                <Text style={s.empty}>Search or scan to add products.</Text>
              )}

              {/* Lines */}
              <Text style={[s.label, { marginTop: 18 }]}>Lines</Text>
              <View style={[s.row, s.headerRow]}>
                <Text style={[s.cell, s.colName2, s.headerText]}>name</Text>
                <Text style={[s.cell, s.colQty, s.headerText]}>qty</Text>
                <Text style={[s.cell, s.colPrice2, s.headerText]}>price</Text>
                <Text style={[s.cell, s.colTotal, s.headerText]}>total</Text>
                <Text style={[s.cell, s.colActS, s.headerText]}> </Text>
              </View>

              {lines.length === 0 ? (
                <Text style={s.empty}>No lines yet.</Text>
              ) : (
                lines.map(l => (
                  <View key={l.product_id} style={[s.row, s.dataRow]}>
                    <Text style={[s.cell, s.colName2]} numberOfLines={1}>{l.name}</Text>
                    <TextInput
                      style={[s.cellInput, s.colQty]}
                      keyboardType="number-pad"
                      value={String(l.qty)}
                      onChangeText={(v) => setQty(l.product_id, v)}
                    />
                    <TextInput
                      style={[s.cellInput, s.colPrice2]}
                      keyboardType="decimal-pad"
                      value={String(l.unit_price_usd)}
                      onChangeText={(v) => setPrice(l.product_id, v)}
                    />
                    <Text style={[s.cell, s.colTotal]}>{money(l.qty * l.unit_price_usd)}</Text>
                    <View style={[s.cell, s.colActS]}>
                      <TouchableOpacity onPress={() => removeLine(l.product_id)} style={s.xBtn}>
                        <Text style={{ color: 'white', fontWeight: '800' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          }
          ListFooterComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <View style={s.totals}><Text style={s.totalText}>Total (USD): {totalUsd.toFixed(2)}</Text></View>
              <TouchableOpacity style={s.submit} disabled={busy} onPress={submit}>
                <Text style={s.submitText}>{busy ? 'Saving…' : 'Create Sale'}</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Scanner modal */}
        <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
          <SafeAreaView style={{ flex: 1 }}>
            {!permission?.granted ? (
              <View style={s.center}>
                <Text>We need camera access to scan barcodes.</Text>
                <TouchableOpacity style={s.outlineBtn} onPress={requestPermission}>
                  <Text>Grant permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.outlineBtn, { marginTop: 8 }]} onPress={() => setScanOpen(false)}>
                  <Text>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={{ flex: 1 }}
                  onBarcodeScanned={(e) => onScanned({ data: e.data })}
                  barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_e', 'upc_a'] }}
                />
                <View style={s.scanOverlay}>
                  {lastAdded && (
                    <View style={s.addedBanner}>
                      <Text style={s.addedText}>Added: {lastAdded.name}  (qty {lastAdded.qty})</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setScanOpen(false)} style={s.cancelBtn}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** =========
 *  MINI PICKER (internal, simple modal) — used for Device/Session/Store only
 *  ========= */
function Picker(props: {
  label: string;
  value: string;
  onOpen: (setList: (v: any[]) => void) => void | Promise<void>;
  onPick: (v: any) => void;
}) {
  const { label, value, onOpen, onPick } = props;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const openModal = useCallback(async () => {
    setOpen(true); setLoading(true);
    try { await onOpen(setList); } finally { setLoading(false); }
  }, [onOpen]);

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.select} onPress={openModal}>
        <Text style={s.selectText}>{value || `Select ${label.toLowerCase()}…`}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 12, flex: 1 }}>
            <Text style={s.title}>Select {label}</Text>
            {loading ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
            ) : (
              <FlatList
                data={list}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.row, s.dataRow]}
                    onPress={() => { onPick(item); setOpen(false); }}
                  >
                    <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>
                      {item.label || item.name || item.id}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={s.empty}>No options</Text>}
              />
            )}
            <TouchableOpacity onPress={() => setOpen(false)} style={[s.cancelBtn, { alignSelf: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

/** =========
 *  STYLES
 *  ========= */
const s = StyleSheet.create({
  xBtn: {
    backgroundColor: 'black',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  wrap: { padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  notice: { padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },

  label: { fontWeight: '700', marginTop: 6 },
  subLabel: { fontWeight: '600', marginTop: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  select: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  selectText: { fontWeight: '700' },

  // Search & scan
  topRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { flex: 1, borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  scanBtn: { backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  scanText: { color: 'white', fontWeight: '800' },

  // Customer popup (floats)
  customerPopup: {
    position: 'absolute',
    top: 310, // lifted area so popup is visible above keyboard (tweak if layout changes)
    left: 16, right: 16,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    zIndex: 20, maxHeight: 280,
  },
  customerItem: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },

  // Table for search results
  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colSku: { flexBasis: '24%', flexGrow: 0, flexShrink: 1 },
  colName: { flexBasis: '34%', flexGrow: 1, flexShrink: 1 },
  colUnit: { flexBasis: '14%', flexGrow: 0, flexShrink: 1 },
  colPrice: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colAct: { flexBasis: '12%', flexGrow: 0, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row' },

  actBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtn: { backgroundColor: '#000' },
  actBtnText: { color: 'white', fontWeight: '800' },

  // Lines table
  colName2: { flexBasis: '40%', flexGrow: 1, flexShrink: 1 },
  colQty: { flexBasis: '14%', flexGrow: 0, flexShrink: 1 },
  colPrice2: { flexBasis: '22%', flexGrow: 0, flexShrink: 1 },
  colTotal: { flexBasis: '18%', flexGrow: 0, flexShrink: 1 },
  colActS: { flexBasis: '6%', flexGrow: 0, flexShrink: 0, alignItems: 'flex-end' },
  cellInput: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white', marginHorizontal: 4 },

  totals: { alignItems: 'flex-end', marginTop: 8 },
  totalText: { fontWeight: '800', fontSize: 16 },

  submit: { marginTop: 14, backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800' },

  // generic
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#aaa' },

  // Scanner overlay
  scanOverlay: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', gap: 10 },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
  addedBanner: { backgroundColor: 'rgba(0, 128, 0, 0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  addedText: { color: 'white', fontWeight: '800' },

  // Payments
  payRow: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12, marginTop: 8 },
  tagBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tagTxt: { color: '#fff', fontWeight: '800' },

  // at the end of the styles object
empty: { textAlign: 'center', color: '#777', marginTop: 12 },
});