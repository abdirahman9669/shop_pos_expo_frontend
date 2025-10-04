// app/barcodes/new.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE, TOKEN } from '@/src/config';

/** ===== auth (temp) ===== */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** ===== types ===== */
type Product = { id: string; sku?: string; name: string; unit?: string };
type PRow = Product & { display: string };
type BarItem = { code: string; multiplier: string; source: string };

/** ===== utils ===== */
const isDigits = (s: string) => /^\d{6,20}$/.test(s.trim());

export default function BarcodeNew() {
  const router = useRouter();

  /** selected product */
  const [product, setProduct] = useState<Product | null>(null);

  /** product picker modal */
  const [openPicker, setOpenPicker] = useState(false);
  const [pQuery, setPQuery] = useState('');
  const [pLoading, setPLoading] = useState(false);
  const [pRows, setPRows] = useState<PRow[]>([]);
  const debRef = useRef<any>(null);

  /** barcodes queue */
  const [items, setItems] = useState<BarItem[]>([]);
  const [code, setCode] = useState('');
  const [multiplier, setMultiplier] = useState('1');
  const [source, setSource] = useState('');

  /** scan modal */
  const [scanOpen, setScanOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handlingRef = useRef(false);
  const lastHandledRef = useRef(0);

  /** busy state */
  const [saving, setSaving] = useState(false);

  /** fetch products (search-like) */
  const loadProducts = useCallback(async (q: string) => {
    setPLoading(true);
    try {
      const qs = new URLSearchParams({
        limit: '40',
        ...(q.trim() ? { q: q.trim() } : {}),
      }).toString();
      const r = await fetch(`${API_BASE}/api/products?${qs}`, { headers: AUTH });
      const j = await r.json();
      const arr: Product[] = Array.isArray(j) ? j : (j?.data ?? j ?? []);
      setPRows(
        arr.map(p => ({
          ...p,
          display: [p.name, p.sku ? `(${p.sku})` : ''].filter(Boolean).join(' ')
        }))
      );
    } catch {
      setPRows([]);
    } finally {
      setPLoading(false);
    }
  }, []);

  /** debounce product search */
  useEffect(() => {
    if (!openPicker) return;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => loadProducts(pQuery), 250);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [openPicker, pQuery, loadProducts]);

  /** add one barcode row */
  const addItem = useCallback((from?: string) => {
    const c = (from ?? code).trim();
    const m = multiplier.trim();
    const s = source.trim();

    if (!c) return Alert.alert('Missing', 'Enter or scan a barcode.');
    if (!isDigits(c)) return Alert.alert('Invalid', 'Barcode must be 6–20 digits.');
    const mult = Number(m || '1');
    if (!Number.isFinite(mult) || mult <= 0) return Alert.alert('Invalid', 'Multiplier must be > 0.');

    // prevent duplicate in our local queue
    if (items.some(x => x.code === c)) {
      return Alert.alert('Duplicate', 'This barcode is already in the list.');
    }

    setItems(prev => [...prev, { code: c, multiplier: String(mult), source: s }]);
    setCode('');
    // keep multiplier/source as-is for next scans, useful when adding many
  }, [code, multiplier, source, items]);

  const removeItem = useCallback((c: string) => {
    setItems(prev => prev.filter(x => x.code !== c));
  }, []);

  /** scanner */
  const openScanner = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera', 'We need camera permission to scan barcodes.');
        return;
      }
    }
    setScanOpen(true);
  }, [permission?.granted, requestPermission]);

  const onScan = useCallback(async (e: { data: string }) => {
    if (handlingRef.current) return;
    const now = Date.now();
    if (now - lastHandledRef.current < 800) return;
    handlingRef.current = true;
    lastHandledRef.current = now;

    try {
      const raw = String(e?.data || '').trim();
      if (!raw) return;
      setScanOpen(false);
      // add directly to queue (don’t require “Add” tap)
      addItem(raw);
    } catch (err: any) {
      Alert.alert('Scan error', err?.message || 'Could not add barcode');
    } finally {
      handlingRef.current = false;
    }
  }, [addItem]);

  /** submit */
  const save = useCallback(async () => {
    if (!product) return Alert.alert('Pick product', 'Please select a product first.');
    if (items.length === 0) {
      // allow single field add too
      if (!code.trim()) return Alert.alert('Nothing to save', 'Add at least one barcode.');
      addItem(); // adds the single input
      return;
    }

    setSaving(true);
    try {
      // batch payload
      const payload = {
        product_id: product.id,
        codes: items.map(i => ({
          code: i.code,
          multiplier: Number(i.multiplier || '1'),
          source: i.source || '',
        })),
      };

      const r = await fetch(`${API_BASE}/api/product-barcodes`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }

      Alert.alert('✅ Saved', `Created ${j.count} barcode(s).`);
      // reset for next
      setItems([]);
      setCode('');
      setSource('');
      setMultiplier('1');
      // stay on page or go back
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [product, items, code, addItem, router]);

  const headerRight = useMemo(
    () => () => (
      <TouchableOpacity onPress={save} style={s.headerBtn} disabled={saving}>
        <Text style={s.headerBtnTxt}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    ),
    [save, saving]
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New Barcode(s)', headerRight }} />

      <View style={{ padding: 16, gap: 12 }}>
        {/* product picker */}
        <Text style={s.label}>Product</Text>
        <TouchableOpacity style={s.select} onPress={() => setOpenPicker(true)}>
          <Text style={s.selectTxt}>
            {product ? [product.name, product.sku ? `(${product.sku})` : ''].filter(Boolean).join(' ') : 'Select product…'}
          </Text>
        </TouchableOpacity>

        {/* quick add row */}
        <Text style={s.label}>Add barcode</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={code}
            onChangeText={setCode}
            placeholder="Type barcode (6–20 digits)…"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => addItem()}
          />
          <TouchableOpacity onPress={openScanner} style={s.btn}>
            <Text style={s.btnTxt}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => addItem()} style={[s.btn, { backgroundColor: '#111' }]}>
            <Text style={s.btnTxt}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.small}>Multiplier</Text>
            <TextInput
              style={s.input}
              value={multiplier}
              onChangeText={setMultiplier}
              keyboardType="decimal-pad"
              placeholder="1"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={s.small}>Source (optional)</Text>
            <TextInput
              style={s.input}
              value={source}
              onChangeText={setSource}
              placeholder="e.g., Factory, Outer-Pack"
            />
          </View>
        </View>

        {/* queue list */}
        <Text style={[s.label, { marginTop: 4 }]}>Queued barcodes ({items.length})</Text>
        {items.length === 0 ? (
          <Text style={{ color: '#666' }}>No barcodes added yet.</Text>
        ) : (
          <View style={s.listBox}>
            {items.map(it => (
              <View key={it.code} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowMain}>{it.code}</Text>
                  <Text style={s.rowSub}>mult: {it.multiplier || '1'} {it.source ? ` • ${it.source}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(it.code)} style={s.xBtn}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Product picker modal */}
      <Modal visible={openPicker} animationType="slide" onRequestClose={() => setOpenPicker(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 10, flex: 1 }}>
            <Text style={s.title}>Select Product</Text>
            <TextInput
              style={s.input}
              placeholder="Search name or SKU…"
              value={pQuery}
              onChangeText={setPQuery}
              autoCapitalize="none"
            />
            {pLoading ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
            ) : (
              <FlatList
                data={pRows}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.card}
                    onPress={() => {
                      setProduct(item);
                      setOpenPicker(false);
                    }}
                  >
                    <Text style={s.rowMain}>{item.display}</Text>
                    <Text style={s.rowSub}>{item.unit ? `unit: ${item.unit}` : ''}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ color: '#666' }}>No products</Text>}
              />
            )}
            <TouchableOpacity onPress={() => setOpenPicker(false)} style={[s.btn, { alignSelf: 'center' }]}>
              <Text style={s.btnTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Scanner modal */}
      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          {!permission?.granted ? (
            <View style={s.center}>
              <Text>We need camera access to scan barcodes.</Text>
              <TouchableOpacity style={[s.btn, { marginTop: 12 }]} onPress={requestPermission}>
                <Text style={s.btnTxt}>Grant permission</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { marginTop: 8 }]} onPress={() => setScanOpen(false)}>
                <Text style={s.btnTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={{ flex: 1 }}
                onBarcodeScanned={(e) => onScan({ data: e.data })}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_e', 'upc_a'],
                }}
              />
              <View style={s.scanOverlay}>
                <TouchableOpacity onPress={() => setScanOpen(false)} style={s.cancelBtn}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  headerBtnTxt: { color: '#fff', fontWeight: '800' },

  title: { fontWeight: '800', fontSize: 18 },
  label: { fontWeight: '700' },
  small: { fontWeight: '600', color: '#555', marginBottom: 4 },

  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  select: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  selectTxt: { fontWeight: '700' },

  btn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800' },

  listBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, backgroundColor: '#fff', padding: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#fafafa', borderRadius: 10 },
  rowMain: { fontWeight: '800' },
  rowSub: { color: '#666', marginTop: 2 },

  xBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12 },

  scanOverlay: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
});