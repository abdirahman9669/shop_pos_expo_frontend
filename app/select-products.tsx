import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, FlatList, Modal, Alert, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE } from '@/src/config';

// --- endpoints ---
const PRODUCTS_URL = `${API_BASE}/api/products`;
const PRODUCTS_BY_BAR_URL = `${API_BASE}/api/products/byBar`;

// Dev only — move to secure storage later
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODUzODc5NCwiZXhwIjoxNzU5MTQzNTk0fQ.adMEzVETyptj6qJ-2ac0T7XAWgr1ugKpTRwgEoNoXgA';

type Product = {
  id: string;
  sku: string;
  name: string;
  unit?: string;
  price_usd?: string | number;
};

function fmtPrice(v: string | number | undefined) {
  if (v == null) return '0.00';
  if (typeof v === 'string') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export default function SelectProducts() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // selected products { [id]: product }
  const [selected, setSelected] = useState<Record<string, Product>>({});

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }),
    []
  );

  // ---------- selection helpers ----------
  const addSelected = useCallback((p: Product) => {
    if (!p?.id) return;
    setSelected(prev => ({ ...prev, [p.id]: p }));
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelected(prev => { const c = { ...prev }; delete c[id]; return c; });
  }, []);

  // ---------- manual search via ?q= ----------
  const fetchByName = useCallback(async (q: string) => {
    const qs = new URLSearchParams({ q: q.trim(), limit: '25' });
    setLoading(true);
    try {
      const res = await fetch(`${PRODUCTS_URL}?${qs.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // your API returns { ok, total, data }
      const list: Product[] = Array.isArray(json) ? json : (json.data ?? []);
      setResults(list);
    } catch (e: any) {
      Alert.alert('Search error', e.message ?? 'Failed to search');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  // ---------- barcode search via /byBar?barcode= ----------
  const parseBarResponse = (j: any): Product | null => {
    // Accept common shapes: product, {product}, {data:[p]}, {data:p}, [p]
    if (j && j.id && j.sku) return j as Product;
    if (j?.product && j.product.id) return j.product as Product;
    if (Array.isArray(j) && j[0]?.id) return j[0] as Product;
    if (j?.data) {
      if (Array.isArray(j.data) && j.data[0]?.id) return j.data[0];
      if (j.data?.id) return j.data;
    }
    return null;
  };

  const fetchByBarcode = useCallback(async (code: string) => {
    try {
      const url = `${PRODUCTS_BY_BAR_URL}?barcode=${encodeURIComponent(code)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        if (res.status === 404) return Alert.alert('Not found', `No product for barcode ${code}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const j = await res.json();
      const p = parseBarResponse(j);
      if (!p) return Alert.alert('Not found', `No product for barcode ${code}`);
      addSelected(p);
    } catch (e: any) {
      Alert.alert('Scan lookup failed', e.message ?? 'Could not fetch product');
    }
  }, [headers, addSelected]);

  // ---------- debounce typing ----------
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(() => { fetchByName(query); }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, fetchByName]);

  // camera permission on open
  useEffect(() => {
    if (scanOpen && !permission?.granted) requestPermission();
  }, [scanOpen, permission?.granted, requestPermission]);

  const onScanned = useCallback((e: { data: string }) => {
    setScanOpen(false);
    const code = String(e.data || '').trim();
    if (code) fetchByBarcode(code);
  }, [fetchByBarcode]);

  const selectedArr = Object.values(selected);

  const done = useCallback(() => {
    // Replace with your navigation/state handling (e.g., add to cart, goBack, etc.)
    Alert.alert('Selected', JSON.stringify(selectedArr.map(p => ({
      id: p.id, sku: p.sku, name: p.name, unit: p.unit, price_usd: fmtPrice(p.price_usd)
    })), null, 2));
  }, [selectedArr]);

  // ---------- table header ----------
  const TableHeader = () => (
    <View style={[s.row, s.headerRow]}>
      <Text style={[s.cell, s.colSku, s.headerText]}>sku</Text>
      <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
      <Text style={[s.cell, s.colUnit, s.headerText]}>unit</Text>
      <Text style={[s.cell, s.colPrice, s.headerText]}>price_usd</Text>
      <Text style={[s.cell, s.colAct, s.headerText]}>action</Text>
    </View>
  );

  // ---------- table row ----------
  const renderItem = ({ item }: { item: Product }) => {
    const isSel = !!selected[item.id];
    return (
      <View style={[s.row, s.dataRow, isSel && s.rowSelected]}>
        <Text style={[s.cell, s.colSku]} numberOfLines={1}>{item.sku}</Text>
        <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.cell, s.colUnit]} numberOfLines={1}>{item.unit ?? ''}</Text>
        <Text style={[s.cell, s.colPrice]} numberOfLines={1}>{fmtPrice(item.price_usd)}</Text>

        <View style={[s.cell, s.colAct]}>
          {isSel ? (
            <TouchableOpacity style={[s.actBtn, s.removeBtn]} onPress={() => removeSelected(item.id)}>
              <Text style={s.actBtnText}>×</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.actBtn, s.addBtn]} onPress={() => addSelected(item)}>
              <Text style={s.actBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Search + Scan Row */}
      <View style={s.topRow}>
        <TextInput
          style={s.search}
          placeholder="Search by name or SKU…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={s.scanBtn} onPress={() => setScanOpen(true)}>
          <Text style={s.scanText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Selected chips */}
      {selectedArr.length > 0 && (
        <ScrollView horizontal contentContainerStyle={s.chips} showsHorizontalScrollIndicator={false}>
          {selectedArr.map(p => (
            <View key={p.id} style={s.chip}>
              <Text style={s.chipText}>
                {p.sku} · {p.name} · {p.unit ?? ''} · {fmtPrice(p.price_usd)}
              </Text>
              <TouchableOpacity onPress={() => removeSelected(p.id)} style={s.chipX}>
                <Text style={{ color: 'white', fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Table */}
      {loading ? (
        <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Searching…</Text></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={results.length ? TableHeader : undefined}
          stickyHeaderIndices={results.length ? [0] : undefined}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={renderItem}
          ListEmptyComponent={
            query.trim().length === 0
              ? <Text style={s.empty}>Type to search products, or scan a barcode.</Text>
              : <Text style={s.empty}>No matches.</Text>
          }
        />
      )}

      {/* Bottom bar */}
      <View style={s.bottom}>
        <Text style={{ fontWeight: '700' }}>{selectedArr.length} selected</Text>
        <TouchableOpacity style={s.doneBtn} onPress={done}>
          <Text style={{ color: 'white', fontWeight: '800' }}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Scanner modal */}
      <Modal visible={scanOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          {!permission?.granted ? (
            <View style={s.center}>
              <Text>We need camera access to scan barcodes.</Text>
              <TouchableOpacity style={s.outlineBtn} onPress={requestPermission}>
                <Text>Grant permission</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.outlineBtn, { marginTop: 8 }]} onPress={() => setScanOpen(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={{ flex: 1 }}
                onBarcodeScanned={(e) => onScanned({ data: e.data })}
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
  // top
  topRow: { flexDirection: 'row', padding: 16, gap: 8, alignItems: 'center' },
  search: { flex: 1, borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  scanBtn: { backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  scanText: { color: 'white', fontWeight: '800' },

  // chips
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { fontWeight: '600' },
  chipX: { backgroundColor: '#000', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // table
  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },
  rowSelected: { borderLeftWidth: 3, borderLeftColor: '#000' },

  cell: { paddingHorizontal: 4 },
  colSku: { flexBasis: '24%', flexGrow: 0, flexShrink: 1 },
  colName: { flexBasis: '34%', flexGrow: 1, flexShrink: 1 },
  colUnit: { flexBasis: '14%', flexGrow: 0, flexShrink: 1 },
  colPrice: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colAct: { flexBasis: '12%', flexGrow: 0, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row' },

  actBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtn: { backgroundColor: '#000' },
  removeBtn: { backgroundColor: '#d32f2f' },
  actBtnText: { color: 'white', fontWeight: '800' },

  empty: { textAlign: 'center', color: '#777', marginTop: 24 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#aaa' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'white',
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            borderTopWidth: 1, borderTopColor: '#eee' },
  doneBtn: { backgroundColor: 'black', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },

  // scanner footer
  scanOverlay: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
});
