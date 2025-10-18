// app/purchase-new.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE, TOKEN } from '@/src/config';

/* ===========================
 *  API ENDPOINTS / AUTH
 * =========================== */
const URLS = {
  products: `${API_BASE}/api/products`,
  byBar: `${API_BASE}/api/products/byBar`,
  suppliers: `${API_BASE}/api/suppliers`,
  stores: `${API_BASE}/api/stores`,
  purchases: `${API_BASE}/api/purchases`,
};
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/* ===============
 *  TYPES
 * =============== */
type Product = { id: string; sku: string; name: string; unit?: string; price_usd?: string | number };
type Supplier = { id: string; name: string; phone?: string | null };
type Store = { id: string; name: string; type?: string };
type Line = {
  product_id: string;
  name: string;
  qty: number;
  unit_cost_usd: number;
  expiry_date?: string | null; // YYYY-MM-DD
  store_id: string;            // ← per-line store
};

/* ===============
 *  UTILS
 * =============== */
const n = (v: any, d = 0) => {
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : d;
};
const money = (v: any) => n(v, 0).toFixed(2);
const pad2 = (x: number) => (x < 10 ? `0${x}` : `${x}`);
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromYMD = (s?: string | null) => {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(v => parseInt(v, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
};

/* ===========================
 *  GENERIC PICKER (SUPPLIER)
 * =========================== */
function SupplierPicker(props: {
  value: Supplier | null;
  onPick: (v: Supplier) => void;
  fetchList: () => Promise<Supplier[]>;
}) {
  const { value, onPick, fetchList } = props;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchList();
      setList(rows ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(v => (v.name || '').toLowerCase().includes(s) || (v.phone || '').includes(s));
  }, [list, q]);

  return (
    <>
      <Text style={s.label}>Supplier</Text>
      <TouchableOpacity style={s.select} onPress={() => setOpen(true)}>
        <Text style={s.selectText}>{value ? (value.name + (value.phone ? ` — ${value.phone}` : '')) : 'Select supplier…'}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 12, flex: 1 }}>
            <Text style={s.title}>Select Supplier</Text>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search supplier…"
              style={s.search}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loading ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {filtered.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.row, s.dataRow]}
                    onPress={() => { onPick(item); setOpen(false); }}
                  >
                    <Text numberOfLines={1} style={[s.cell, { flex: 1 }]}>{item.name}{item.phone ? ` — ${item.phone}` : ''}</Text>
                  </TouchableOpacity>
                ))}
                {filtered.length === 0 && <Text style={s.empty}>No suppliers</Text>}
              </ScrollView>
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

/* ===========================
 *  MAIN SCREEN
 * =========================== */
export default function PurchaseNew() {
  // selections
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  // stores list + default primary
  const [stores, setStores] = useState<Store[]>([]);
  const [primaryStoreId, setPrimaryStoreId] = useState<string | null>(null);

  // supplier invoice number
  const [purchaseNumber, setPurchaseNumber] = useState('');

  // product search / scan
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // lines
  const [lines, setLines] = useState<Line[]>([]);

  // expiry picker
  const [expiryPickerOpen, setExpiryPickerOpen] = useState(false);
  const [pickerTargetProductId, setPickerTargetProductId] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());

  // per-line store picker
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [storePickerTargetProductId, setStorePickerTargetProductId] = useState<string | null>(null);

  // payment
  const [payMethod, setPayMethod] = useState<'CASH_USD' | 'CASH_SOS'>('CASH_USD');
  const [amountPaidUsd, setAmountPaidUsd] = useState('0.00');

  // UI
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ name: string; qty: number } | null>(null);
  const feedbackTimerRef = useRef<any>(null);
  const handlingRef = useRef(false);
  const lastHandledByCodeRef = useRef(new Map<string, number>());

  /* -------- Fetchers -------- */
  const fetchSuppliers = useCallback(async (): Promise<Supplier[]> => {
    const r = await fetch(URLS.suppliers, { headers: authHeaders });
    const j = await r.json();
    return (j?.data ?? j ?? []);
  }, []);
  const fetchStores = useCallback(async (): Promise<Store[]> => {
    const r = await fetch(URLS.stores, { headers: authHeaders });
    const j = await r.json();
    return (j?.data ?? j ?? []);
  }, []);

  // load stores & pick primary default
  useEffect(() => {
    (async () => {
      try {
        const sts = await fetchStores();
        setStores(sts);
        const primary = sts.find(s => /primary/i.test(s.name)) ?? sts[0] ?? null;
        setPrimaryStoreId(primary ? primary.id : null);
      } catch {
        setStores([]);
        setPrimaryStoreId(null);
      }
    })();
  }, [fetchStores]);

  /* -------- Search products (debounced) -------- */
  const debounceRef = useRef<any>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const qs = new URLSearchParams({ q: query.trim(), limit: '25' });
        const r = await fetch(`${URLS.products}?${qs.toString()}`, { headers: authHeaders });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setResults(Array.isArray(j) ? j : j?.data ?? []);
      } catch (e: any) {
        Alert.alert('Search error', e?.message || 'Failed to search');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  /* -------- Scanner -------- */
  useEffect(() => { if (scanOpen && !permission?.granted) requestPermission(); }, [scanOpen, permission?.granted, requestPermission]);

  const addOrBumpLine = useCallback((p: Product): number => {
    let newQty = 1;
    setLines(prev => {
      const idx = prev.findIndex(l => l.product_id === p.id);
      const defaultStore = primaryStoreId ?? (stores[0]?.id ?? '');
      if (idx >= 0) {
        const copy = [...prev];
        const q = Math.max(1, (copy[idx].qty || 0) + 1);
        copy[idx] = { ...copy[idx], qty: q };
        newQty = q;
        return copy;
      }
      const fallbackCost = typeof p.price_usd === 'string' ? n(p.price_usd, 0) : n(p.price_usd, 0);
      newQty = 1;
      return [...prev, {
        product_id: p.id,
        name: p.name || p.sku,
        qty: 1,
        unit_cost_usd: fallbackCost,
        expiry_date: null,
        store_id: defaultStore, // ← default line store
      }];
    });
    return newQty;
  }, [primaryStoreId, stores]);

  const onScanned = useCallback(async (e: { data: string }) => {
    const code = String(e.data || '').trim();
    if (!code) return;
    if (handlingRef.current) return;
    handlingRef.current = true;

    const now = Date.now();
    const lastForCode = lastHandledByCodeRef.current.get(code) || 0;
    if (now - lastForCode < 800) {
      handlingRef.current = false;
      return;
    }
    lastHandledByCodeRef.current.set(code, now);

    try {
      const r = await fetch(`${URLS.byBar}?barcode=${encodeURIComponent(code)}`, { headers: authHeaders });
      if (!r.ok) {
        if (r.status === 404) {
          Alert.alert('Not found', `No product for barcode ${code}`);
          return;
        }
        throw new Error(`HTTP ${r.status}`);
      }
      const j = await r.json();
      const p: Product | null =
        (j && j.id && j.sku) ? j :
        (j?.product?.id ? j.product : (Array.isArray(j?.data) ? j.data[0] : j?.data?.id ? j.data : null));
      if (!p) {
        Alert.alert('Not found', `No product for barcode ${code}`);
        return;
      }

      const qty = addOrBumpLine(p);
      setLastAdded({ name: p.name || p.sku, qty });
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setLastAdded(null), 1400);
    } catch (err: any) {
      Alert.alert('Scan lookup failed', err?.message || 'Could not fetch product');
    } finally {
      handlingRef.current = false;
    }
  }, [addOrBumpLine]);

  /* -------- Line edits -------- */
  const setQty = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, qty: Math.max(1, Math.floor(n(v, 1))) } : l));

  const setCost = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, unit_cost_usd: Math.max(0, n(v, 0)) } : l));

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.product_id !== id));

  // expiry picker
  const openExpiryPicker = (product_id: string) => {
    const line = lines.find(l => l.product_id === product_id);
    setPickerDate(fromYMD(line?.expiry_date ?? null));
    setPickerTargetProductId(product_id);
    setExpiryPickerOpen(true);
  };
  const applyExpiry = (d: Date) => {
    if (!pickerTargetProductId) return;
    const ymd = toYMD(d);
    setLines(prev => prev.map(l => l.product_id === pickerTargetProductId ? { ...l, expiry_date: ymd } : l));
    setExpiryPickerOpen(false);
  };
  const clearExpiry = () => {
    if (!pickerTargetProductId) return;
    setLines(prev => prev.map(l => l.product_id === pickerTargetProductId ? { ...l, expiry_date: null } : l));
    setExpiryPickerOpen(false);
  };

  // per-line store picker
  const openStorePicker = (product_id: string) => {
    setStorePickerTargetProductId(product_id);
    setStorePickerOpen(true);
  };
  const pickStore = (store_id: string) => {
    if (!storePickerTargetProductId) return;
    setLines(prev => prev.map(l => l.product_id === storePickerTargetProductId ? { ...l, store_id } : l));
    setStorePickerOpen(false);
  };

  const storeName = (id?: string) => stores.find(s => s.id === id)?.name ?? '—';

  const totalUsd = useMemo(() => lines.reduce((s, l) => s + (l.qty * l.unit_cost_usd), 0), [lines]);

  /* -------- Submit -------- */
  const submit = useCallback(async () => {
    setMsg('');
    if (!supplier) return setMsg('Pick a supplier.');
    if (lines.length === 0) return setMsg('Add at least one product line.');
    if (!primaryStoreId && stores.length === 0) return setMsg('No stores available.');

    // optional: validate all lines have a store_id
    const missing = lines.find(l => !l.store_id);
    if (missing) return setMsg('Each line must have a store.');

    setBusy(true);
    try {
      const body = {
        supplier_id: supplier.id,
        purchase_number: purchaseNumber.trim() || null,
        // Store is now PER LINE:
        lines: lines.map(l => ({
          product_id: l.product_id,
          qty: l.qty,
          unit_cost_usd: l.unit_cost_usd,
          expiry_date: l.expiry_date ?? null,
          store_id: l.store_id, // ← per-line store
        })),
        pay: { method: payMethod, amount_usd: n(amountPaidUsd, 0) },
      };

      const r = await fetch(URLS.purchases, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      Alert.alert('✅ Purchase saved', j?.purchase_id || 'OK');
      setLines([]);
      setAmountPaidUsd('0.00');
      setPurchaseNumber('');
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Failed to save purchase'}`);
    } finally {
      setBusy(false);
    }
  }, [supplier, lines, payMethod, amountPaidUsd, purchaseNumber]);

  /* ===========================
   *  RENDER
   * =========================== */
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={s.wrap}>
          <Text style={s.title}>New Purchase</Text>
          {msg ? <Text style={s.notice}>{msg}</Text> : null}

          {/* Supplier */}
          <SupplierPicker
            value={supplier}
            onPick={setSupplier}
            fetchList={useCallback(async () => await fetchSuppliers(), [fetchSuppliers])}
          />

          {/* Purchase number */}
          <Text style={s.label}>Purchase number (supplier invoice #)</Text>
          <TextInput
            value={purchaseNumber}
            onChangeText={setPurchaseNumber}
            style={s.input}
            autoCapitalize="characters"
            placeholder="e.g. INV-2025-00123"
          />

          {/* Payment */}
          <Text style={s.label}>Payment</Text>
          <View style={s.payRow}>
            <TouchableOpacity
              style={[s.payBtn, payMethod === 'CASH_USD' && s.payBtnActive]}
              onPress={() => setPayMethod('CASH_USD')}
            >
              <Text style={[s.payBtnText, payMethod === 'CASH_USD' && s.payBtnTextActive]}>CASH_USD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.payBtn, payMethod === 'CASH_SOS' && s.payBtnActive]}
              onPress={() => setPayMethod('CASH_SOS')}
            >
              <Text style={[s.payBtnText, payMethod === 'CASH_SOS' && s.payBtnTextActive]}>CASH_SOS</Text>
            </TouchableOpacity>
            <TextInput
              value={amountPaidUsd}
              onChangeText={setAmountPaidUsd}
              keyboardType="decimal-pad"
              style={[s.input, { flex: 1 }]}
              placeholder="Paid (USD)"
            />
          </View>

          {/* Search & Scan */}
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

          {/* Search results */}
          {searching ? (
            <View style={s.center}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8 }}>Searching…</Text>
            </View>
          ) : results.length ? (
            <>
              <View style={[s.row, s.headerRow]}>
                <Text style={[s.cell, s.colSku, s.headerText]}>sku</Text>
                <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
                <Text style={[s.cell, s.colUnit, s.headerText]}>unit</Text>
                <Text style={[s.cell, s.colPrice, s.headerText]}>last_price</Text>
                <Text style={[s.cell, s.colAct, s.headerText]}>action</Text>
              </View>
              {results.map(item => {
                const lastPrice = typeof item.price_usd === 'string' ? item.price_usd : money(item.price_usd);
                return (
                  <View key={item.id} style={[s.row, s.dataRow]}>
                    <Text style={[s.cell, s.colSku]} numberOfLines={1}>{item.sku}</Text>
                    <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.cell, s.colUnit]} numberOfLines={1}>{item.unit ?? ''}</Text>
                    <Text style={[s.cell, s.colPrice]} numberOfLines={1}>{lastPrice}</Text>
                    <View style={[s.cell, s.colAct]}>
                      <TouchableOpacity
                        style={[s.actBtn, s.addBtn]}
                        onPress={() => {
                          setLines(prev => {
                            const idx = prev.findIndex(l => l.product_id === item.id);
                            const defaultStore = primaryStoreId ?? (stores[0]?.id ?? '');
                            if (idx >= 0) {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
                              return copy;
                            }
                            const fallback = typeof item.price_usd === 'string' ? n(item.price_usd, 0) : n(item.price_usd, 0);
                            return [...prev, {
                              product_id: item.id,
                              name: item.name || item.sku,
                              qty: 1,
                              unit_cost_usd: fallback,
                              expiry_date: null,
                              store_id: defaultStore,
                            }];
                          });
                        }}
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
            <Text style={[s.cell, s.colPrice2, s.headerText]}>unit_cost</Text>
            <Text style={[s.cell, s.colExpiry, s.headerText]}>expiry</Text>
            <Text style={[s.cell, s.colStore, s.headerText]}>store</Text>
            <Text style={[s.cell, s.colTotal, s.headerText]}>total</Text>
            <Text style={[s.cell, s.colActS, s.headerText]} />
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
                  value={String(l.unit_cost_usd)}
                  onChangeText={(v) => setCost(l.product_id, v)}
                />

                {/* expiry picker pill */}
                <TouchableOpacity
                  style={[s.cell, s.pill, s.colExpiry]}
                  onPress={() => openExpiryPicker(l.product_id)}
                  activeOpacity={0.7}
                >
                  <Text style={s.pillText}>{l.expiry_date ? l.expiry_date : 'Set date'}</Text>
                </TouchableOpacity>

                {/* store picker pill */}
                <TouchableOpacity
                  style={[s.cell, s.pill, s.colStore]}
                  onPress={() => openStorePicker(l.product_id)}
                  activeOpacity={0.7}
                >
                  <Text style={s.pillText}>{storeName(l.store_id)}</Text>
                </TouchableOpacity>

                <Text style={[s.cell, s.colTotal]}>{money(l.qty * l.unit_cost_usd)}</Text>

                <View style={[s.cell, s.colActS]}>
                  <TouchableOpacity onPress={() => removeLine(l.product_id)} style={s.xBtn}>
                    <Text style={{ color: 'white', fontWeight: '800' }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Totals + Submit */}
          <View style={s.totals}>
            <Text style={s.totalText}>Total (USD): {totalUsd.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={s.submit} disabled={busy} onPress={submit}>
            <Text style={s.submitText}>{busy ? 'Saving…' : 'Create Purchase'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Scanner Modal */}
      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          {!permission?.granted ? (
            <View style={[s.center, { flex: 1 }]}>
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

      {/* Expiry Date Picker */}
      <Modal visible={expiryPickerOpen} transparent animationType="fade" onRequestClose={() => setExpiryPickerOpen(false)}>
        <View style={s.pickerShade}>
          <View style={s.pickerCard}>
            <Text style={{ fontWeight: '800', marginBottom: 8 }}>Select Expiry Date</Text>

            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(event, date) => {
                if (Platform.OS === 'android') {
                  if (date) applyExpiry(date);
                  else setExpiryPickerOpen(false);
                } else {
                  if (date) setPickerDate(date);
                }
              }}
            />

            {Platform.OS === 'ios' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[s.outlineBtn, { flex: 1 }]} onPress={() => applyExpiry(pickerDate)}>
                  <Text style={{ textAlign: 'center', fontWeight: '700' }}>Set Date</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.outlineBtn, { flex: 1 }]} onPress={clearExpiry}>
                  <Text style={{ textAlign: 'center', fontWeight: '700' }}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.cancelBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setExpiryPickerOpen(false)}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Store Picker */}
      <Modal visible={storePickerOpen} transparent animationType="fade" onRequestClose={() => setStorePickerOpen(false)}>
        <View style={s.pickerShade}>
          <View style={s.pickerCard}>
            <Text style={{ fontWeight: '800', marginBottom: 8 }}>Select Store</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {stores.map(st => (
                <TouchableOpacity
                  key={st.id}
                  style={[s.row, s.dataRow]}
                  onPress={() => pickStore(st.id)}
                >
                  <Text numberOfLines={1} style={[s.cell, { flex: 1 }]}>
                    {st.name}{st.type ? ` (${st.type})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
              {stores.length === 0 && <Text style={s.empty}>No stores</Text>}
            </ScrollView>

            <TouchableOpacity style={[s.cancelBtn, { alignSelf: 'center', marginTop: 10 }]} onPress={() => setStorePickerOpen(false)}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ===========================
 *  STYLES
 * =========================== */
const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  notice: { padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },

  label: { fontWeight: '700', marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  select: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  selectText: { fontWeight: '700' },

  // payment
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  payBtnActive: { backgroundColor: 'black', borderColor: 'black' },
  payBtnText: { fontWeight: '800' },
  payBtnTextActive: { color: 'white' },

  // search / scan
  topRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { flex: 1, borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  scanBtn: { backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  scanText: { color: 'white', fontWeight: '800' },

  // table
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colSku: { flexBasis: '22%', flexGrow: 0, flexShrink: 1 },
  colName: { flexBasis: '34%', flexGrow: 1, flexShrink: 1 },
  colUnit: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colPrice: { flexBasis: '14%', flexGrow: 0, flexShrink: 1 },
  colAct: { flexBasis: '18%', flexGrow: 0, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row' },

  actBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtn: { backgroundColor: '#000' },
  actBtnText: { color: 'white', fontWeight: '800' },

  // lines columns
  colName2: { flexBasis: '28%', flexGrow: 1, flexShrink: 1 },
  colQty: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colPrice2: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colExpiry: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colStore: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colTotal: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colActS: { flexBasis: '4%', flexGrow: 0, flexShrink: 0, alignItems: 'flex-end' },

  cellInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },

  // pills
  pill: {
    borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white',
    alignSelf: 'stretch', justifyContent: 'center',
  },
  pillText: { fontWeight: '700', color: '#333' },

  // totals
  totals: { alignItems: 'flex-end', marginTop: 8 },
  totalText: { fontWeight: '800', fontSize: 16 },

  // submit
  submit: { marginTop: 14, backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800' },

  // generic centers / buttons
  center: { alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#aaa' },

  // scanner overlay
  scanOverlay: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignItems: 'center', gap: 10,
  },
  cancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100,
  },
  addedBanner: {
    backgroundColor: 'rgba(0, 128, 0, 0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
  },
  addedText: { color: 'white', fontWeight: '800' },

  empty: { textAlign: 'center', color: '#777', marginTop: 12 },

  // modal base
  pickerShade: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 18,
  },
  pickerCard: {
    width: '100%', borderRadius: 14, padding: 16, backgroundColor: 'white',
  },

  // small button
  xBtn: {
    backgroundColor: 'black', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
});