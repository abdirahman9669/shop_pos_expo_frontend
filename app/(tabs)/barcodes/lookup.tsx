// app/barcodes/lookup.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE,TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export default function BarcodeLookup() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [fuzzy, setFuzzy] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<any | null>(null);

  // Scanner
  const [scanOpen, setScanOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handlingRef = useRef(false);
  const lastHandledRef = useRef(0);

  const Row = ({ k, v }: { k: string; v: string | number | null | undefined }) => (
    <View style={s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v ?? ''}</Text></View>
  );

  const performSearch = useCallback(async (override?: string) => {
    setErr('');
    setRes(null);
    const c = (override ?? code).trim();
    if (!c) { setErr('Enter a barcode'); return; }
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        fuzzy: String(fuzzy),
        include_inactive: String(includeInactive),
      }).toString();

      // Endpoint mounted as /product-barcodes
      const r = await fetch(`${API_BASE}/api/product-barcodes/${encodeURIComponent(c)}?${qs}`, {
        headers: AUTH,
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRes(j);
    } catch (e: any) {
      setErr(e?.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }, [code, fuzzy, includeInactive]);

  const onScan = useCallback(async (e: { data: string }) => {
    // serialize + cooldown
    if (handlingRef.current) return;
    const now = Date.now();
    if (now - lastHandledRef.current < 800) return;
    handlingRef.current = true;
    lastHandledRef.current = now;

    try {
      const raw = String(e?.data || '').trim();
      if (!raw) return;
      setCode(raw);
      setScanOpen(false);
      await performSearch(raw);
    } catch (err: any) {
      Alert.alert('Scan error', err?.message || 'Could not search');
    } finally {
      handlingRef.current = false;
    }
  }, [performSearch]);

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

  const headerRight = useMemo(() => (
    () => (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/barcodes/new' as const })}
        style={s.headerBtn}
      >
        <Text style={s.headerBtnTxt}>+ New</Text>
      </TouchableOpacity>
    )
  ), [router]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Barcode Lookup', headerRight }} />

      <View style={{ padding: 16, gap: 12 }}>
        <Text style={s.label}>Barcode</Text>
        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={code}
            onChangeText={setCode}
            placeholder="Scan or type barcode…"
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={() => performSearch()}
          />
          <TouchableOpacity onPress={openScanner} style={[s.btn, { marginLeft: 8 }]}>
            <Text style={s.btnTxt}>Scan</Text>
          </TouchableOpacity>
        </View>

        <View style={s.switchRow}>
          <View style={s.switchCell}>
            <Text style={s.switchLabel}>Fuzzy</Text>
            <Switch value={fuzzy} onValueChange={setFuzzy} />
          </View>
          <View style={s.switchCell}>
            <Text style={s.switchLabel}>Include inactive</Text>
            <Switch value={includeInactive} onValueChange={setIncludeInactive} />
          </View>
        </View>

        <TouchableOpacity onPress={() => performSearch()} style={s.btn} disabled={loading}>
          <Text style={s.btnTxt}>{loading ? 'Searching…' : 'Search'}</Text>
        </TouchableOpacity>

        {err ? <Text style={{ color: '#b00020' }}>⚠️ {err}</Text> : null}

        {loading ? (
          <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
        ) : res ? (
          <View style={s.card}>
            <Text style={s.title}>Result</Text>

            <Text style={s.section}>Barcode</Text>
            <Row k="code" v={res?.barcode?.code} />
            <Row k="multiplier" v={res?.barcode?.multiplier} />
            <Row k="source" v={res?.barcode?.source} />

            <Text style={s.section}>Product</Text>
            {res?.product ? (
              <>
                <Row k="name" v={res.product.name} />
                <Row k="sku" v={res.product.sku} />
                <Row k="unit" v={res.product.unit} />
                <Row k="active" v={String(res.product.active)} />
                <Row k="category" v={res.product.category?.name} />
              </>
            ) : (
              <Text style={{ color: '#666' }}>No product linked</Text>
            )}
          </View>
        ) : null}
      </View>

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
  label: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },

  btn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800' },

  headerBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  headerBtnTxt: { color: '#fff', fontWeight: '800' },

  switchRow: { flexDirection: 'row', gap: 12 },
  switchCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchLabel: { fontWeight: '700' },

  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12, gap: 4 },
  title: { fontWeight: '800', fontSize: 16, marginBottom: 4 },
  section: { fontWeight: '800', marginTop: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  k: { fontWeight: '700', color: '#666' },
  v: { fontWeight: '700' },

  scanOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
});