import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Button, Modal, Alert, SafeAreaView,
  TouchableOpacity, ActivityIndicator, ScrollView, Switch
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE } from '@/src/config';

const PRODUCTS_URL = `${API_BASE}/api/products`;

// ⚠️ Dev only: move to secure storage/env later
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTQzMzMtODMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoib3duZXIiLCJzaG9wX2lkIjoiMTExMTExMTEtMTExMS00MTExLTgxMTEtMTExMTExMTExMTExIiwidXNlcm5hbWUiOiJvd25lciIsImlhdCI6MTc1ODUzODc5NCwiZXhwIjoxNzU5MTQzNTk0fQ.adMEzVETyptj6qJ-2ac0T7XAWgr1ugKpTRwgEoNoXgA';

const toNumber = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function CreateProduct() {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('piece'); // server defaults to 'piece'
  const [categoryId, setCategoryId] = useState('55555555-5555-4555-8555-555555555555');
  const [active, setActive] = useState(true);
  const [taxRate, setTaxRate] = useState('0');
  const [priceUsd, setPriceUsd] = useState('1.20'); // will send to both fields

  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');

  const [scanOpen, setScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (scanOpen && !permission?.granted) requestPermission();
  }, [scanOpen, permission?.granted, requestPermission]);

  const addBarcode = useCallback((code: string) => {
    const val = code.trim();
    if (!val) return;
    setBarcodes((prev) => (prev.includes(val) ? prev : [...prev, val]));
  }, []);

  const onScanned = useCallback(({ data }: { data: string }) => {
    addBarcode(String(data || ''));
    setScanOpen(false);
  }, [addBarcode]);

  const removeBarcode = (code: string) => {
    setBarcodes((prev) => prev.filter((b) => b !== code));
  };

  const submit = useCallback(async () => {
    if (!sku.trim()) return Alert.alert('Missing', 'SKU is required');
    if (!name.trim()) return Alert.alert('Missing', 'Name is required');
    if (!categoryId.trim()) return Alert.alert('Missing', 'category_id is required');

    const price = toNumber(priceUsd);

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      unit: unit.trim(),
      category_id: categoryId.trim(),
      active,
      tax_rate: toNumber(taxRate),
      // ✅ send BOTH fields so your API fills both columns
      price_usd: price,
     
      barcodes: barcodes.length ? barcodes : undefined,
    };

    try {
      setSaving(true);
      const res = await fetch(PRODUCTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t}`);
      }
      Alert.alert('✅ Success', 'Product created');
      // Optional reset
      setSku('');
      setName('');
      setUnit('piece');
      setCategoryId('55555555-5555-4555-8555-555555555555');
      setActive(true);
      setTaxRate('0');
      setPriceUsd('1.20');
      setBarcodes([]);
    } catch (e: any) {
      Alert.alert('❌ Error', e.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  }, [sku, name, unit, categoryId, active, taxRate, priceUsd, barcodes]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Label>SKU</Label>
        <Input value={sku} onChangeText={setSku} autoCapitalize="characters" placeholder="MILK-1L" />

        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="Milk 1L" />

        <Label>Unit</Label>
        <Input value={unit} onChangeText={setUnit} placeholder="piece / bottle / kg" />

        <Label>Category ID</Label>
        <Input value={categoryId} onChangeText={setCategoryId} autoCapitalize="none" />

        <Label>Active</Label>
        <View style={s.row}>
          <Switch value={active} onValueChange={setActive} />
          <Text style={{ marginLeft: 8 }}>{active ? 'true' : 'false'}</Text>
        </View>

        <Label>Tax Rate</Label>
        <Input value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" placeholder="0" />

        <Label>Price (USD)</Label>
        <Input value={priceUsd} onChangeText={setPriceUsd} keyboardType="decimal-pad" placeholder="1.20" />

        <Label>Barcodes</Label>
        <View style={s.row}>
          <Input style={{ flex: 1 }} value={barcodeInput} onChangeText={setBarcodeInput} placeholder="6161001234567" />
          <Button
            title="Add"
            onPress={() => { addBarcode(barcodeInput); setBarcodeInput(''); }}
          />
          <View style={{ width: 8 }} />
          <Button title="Scan" onPress={() => setScanOpen(true)} />
        </View>

        {barcodes.length ? (
          <View style={{ gap: 6 }}>
            {barcodes.map((b) => (
              <View key={b} style={s.badgeRow}>
                <Text style={s.badgeText}>{b}</Text>
                <TouchableOpacity onPress={() => removeBarcode(b)} style={s.badgeDelete}>
                  <Text style={{ color: 'white', fontWeight: '800' }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.hint}>No barcodes yet.</Text>
        )}

        <TouchableOpacity style={s.submit} disabled={saving} onPress={submit}>
          {saving ? <ActivityIndicator /> : <Text style={s.submitText}>Create Product</Text>}
        </TouchableOpacity>

        <Text style={s.hint}>
          POST {PRODUCTS_URL.replace(API_BASE, 'API_BASE')}
          {'\n'}Requires Authorization: Bearer & Content-Type: application/json
        </Text>
      </ScrollView>

      {/* Scanner modal */}
      <Modal visible={scanOpen} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          {!permission?.granted ? (
            <View style={s.center}>
              <Text>We need camera access to scan barcodes.</Text>
              <Button title="Grant permission" onPress={requestPermission} />
              <Button title="Cancel" onPress={() => setScanOpen(false)} />
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
                  <Text style={{ color: 'white', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
function Input(props: any) {
  return <TextInput {...props} style={[s.input, props.style]} />;
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  submit: { marginTop: 8, backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800' },
  hint: { marginTop: 8, color: '#777', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scanOverlay: { position: 'absolute', bottom: 24, width: '100%', alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f2f2f2', padding: 8, borderRadius: 10 },
  badgeText: { fontWeight: '600' },
  badgeDelete: { backgroundColor: '#000', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
