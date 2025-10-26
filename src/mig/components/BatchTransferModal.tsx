// app/components/BatchTransferModal.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE, TOKEN } from '@/src/config';

type Store = { id: string; name: string };
type Props = {
  visible: boolean;
  onClose: () => void;

  productId: string;
  batchId: string;
  fromStoreId: string;

  // Optional: show on-hand info if you have it handy (purely UI)
  fromStoreName?: string;
  fromOnHand?: number;

  // Called after successful transfer (so parent can refresh lists)
  onTransferred?: (payload: {
    to_store_id: string; qty: number; transfer_id: string;
  }) => void;
};

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export default function BatchTransferModal({
  visible, onClose, productId, batchId, fromStoreId, fromStoreName, fromOnHand, onTransferred,
}: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [toStore, setToStore] = useState<Store | null>(null);
  const [qty, setQty] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadStores = useCallback(async () => {
    setLoadingStores(true);
    try {
      const r = await fetch(`${API_BASE}/api/stores`, { headers: AUTH });
      const j = await r.json();
      const arr: Store[] = (j?.data ?? j ?? []).filter((s: Store) => s.id && s.name);
      // exclude current "from" store
      setStores(arr.filter(s => s.id !== fromStoreId));
      // preselect first if none picked yet
      if (!toStore && arr.length) setToStore(arr.find(s => s.id !== fromStoreId) ?? null);
    } catch {
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  }, [fromStoreId, toStore]);

  useEffect(() => {
    if (visible) {
      setQty('');
      setToStore(null);
      loadStores();
    }
  }, [visible, loadStores]);

  const qtyNum = useMemo(() => {
    const v = Number(String(qty).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }, [qty]);

  const canSubmit = !!toStore && qtyNum > 0 && !submitting;

  const submit = useCallback(async () => {
    if (!toStore) return;
    if (!(qtyNum > 0)) {
      Alert.alert('Enter quantity', 'Quantity must be greater than zero.'); return;
    }
    setSubmitting(true);
    try {
      const body = {
        product_id: productId,
        batch_id: batchId,
        from_store_id: fromStoreId,
        to_store_id: toStore.id,
        qty: qtyNum,
      };
      const r = await fetch(`${API_BASE}/api/stock-transfers`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      // notify parent then close
      onTransferred?.({ to_store_id: toStore.id, qty: qtyNum, transfer_id: j.transfer?.id });
      onClose();
    } catch (e: any) {
      Alert.alert('Transfer failed', e?.message || 'Could not transfer this batch.');
    } finally {
      setSubmitting(false);
    }
  }, [toStore, qtyNum, productId, batchId, fromStoreId, onTransferred, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <SafeAreaView style={s.sheet}>
          <Text style={s.title}>Transfer batch</Text>

          {/* Context line */}
          {(fromStoreName || fromOnHand != null) && (
            <Text style={s.context}>
              From: <Text style={s.bold}>{fromStoreName || 'Current store'}</Text>
              {fromOnHand != null ? <Text>{' • on-hand '}<Text style={s.bold}>{fromOnHand}</Text></Text> : null}
            </Text>
          )}

          <Text style={s.label}>To store</Text>
          <View style={s.pickWrap}>
            {loadingStores ? (
              <View style={s.centerRow}><ActivityIndicator /><Text style={{ marginLeft: 8 }}>Loading…</Text></View>
            ) : stores.length ? (
              <FlatList
                data={stores}
                keyExtractor={(i) => i.id}
                style={{ maxHeight: 160 }}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                renderItem={({ item }) => {
                  const active = toStore?.id === item.id;
                  return (
                    <TouchableOpacity style={[s.rowBtn, active && s.rowBtnActive]} onPress={() => setToStore(item)}>
                      <Text style={[s.rowBtnText, active && s.rowBtnTextActive]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={s.muted}>No other stores</Text>}
              />
            ) : (
              <Text style={s.muted}>No stores found</Text>
            )}
          </View>

          <Text style={s.label}>Quantity</Text>
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
            placeholder="0"
            style={s.input}
          />

          <View style={s.actions}>
            <TouchableOpacity onPress={onClose} style={[s.btn, s.outline]}>
              <Text style={s.outlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={!canSubmit} style={[s.btn, s.primary, !canSubmit && s.disabled]}>
              <Text style={s.primaryText}>{submitting ? 'Transferring…' : 'Transfer'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  context: { marginBottom: 8, color: '#444' },
  bold: { fontWeight: '800' },
  label: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  pickWrap: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 8, backgroundColor: '#fafafa' },
  rowBtn: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8 },
  rowBtnActive: { backgroundColor: '#000' },
  rowBtnText: { fontWeight: '700' },
  rowBtnTextActive: { color: 'white' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  outline: { borderWidth: 1, borderColor: '#ddd' },
  outlineText: { fontWeight: '800', color: '#333' },
  primary: { backgroundColor: '#000' },
  primaryText: { color: 'white', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  centerRow: { flexDirection: 'row', alignItems: 'center' },
  sep: { height: 6 },
  muted: { color: '#777', paddingVertical: 8, paddingHorizontal: 2 },
});