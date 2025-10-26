// app/sale/components/TransferModal.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, Alert } from 'react-native';
import type { Store } from '@/src/sale/lib/api';

type Ctx = { productId: string; batchId: string; fromStoreId: string; fromStoreName?: string; fromOnHand?: number };

type Props = {
  visible: boolean;
  ctx: Ctx | null;
  loadStores: () => Promise<Store[]>;
  onSubmit: (toStoreId: string, qty: number) => Promise<void>;
  onClose: () => void;
};

export default function TransferModal({ visible, ctx, loadStores, onSubmit, onClose }: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [toStoreId, setToStoreId] = useState<string>('');
  const [qty, setQty] = useState<string>('0');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!visible || !ctx) return;
      setLoadingStores(true);
      try {
        const all = await loadStores();
        if (!alive) return;
        const filtered = all.filter(s => s.id !== ctx.fromStoreId);
        setStores(filtered);
        setToStoreId(filtered[0]?.id ?? '');
      } finally {
        if (alive) setLoadingStores(false);
      }
    })();
    return () => { alive = false; };
  }, [visible, ctx, loadStores]);

  const handleSubmit = useCallback(async () => {
    if (!ctx) return;
    const q = Math.max(1, Math.floor(Number(qty || '0')));
    if (!toStoreId) { Alert.alert('Transfer', 'Select a destination store'); return; }
    if (ctx.fromOnHand != null && q > ctx.fromOnHand) { Alert.alert('Transfer', 'Not enough on-hand in source'); return; }

    setPosting(true);
    try {
      await onSubmit(toStoreId, q);
      Keyboard.dismiss();
      onClose();
    } finally {
      setPosting(false);
    }
  }, [ctx, qty, toStoreId, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
            <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              <Text style={{ fontWeight: '800', fontSize: 20 }}>Transfer batch</Text>
              {ctx ? (
                <Text style={{ marginBottom: 10 }}>
                  From: <Text style={{ fontWeight: '800' }}>{ctx.fromStoreName || 'Source'}</Text>
                  {typeof ctx.fromOnHand === 'number' ? ` • on-hand ${ctx.fromOnHand}` : ''}
                </Text>
              ) : null}

              <Text style={{ fontWeight: '700', marginTop: 6 }}>To store</Text>
              <View style={{ borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' }}>
                {loadingStores ? (
                  <View style={{ paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <ActivityIndicator /><Text>Loading…</Text>
                  </View>
                ) : (
                  <FlatList
                    data={stores}
                    keyExtractor={(i) => i.id}
                    style={{ maxHeight: 180 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { Keyboard.dismiss(); setToStoreId(item.id); }}
                        style={[{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }, toStoreId === item.id && { backgroundColor: '#000' }]}
                      >
                        <Text style={[{ fontWeight: '700' }, toStoreId === item.id && { color: '#fff' }]}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={{ color: '#777' }}>No other stores</Text>}
                  />
                )}
              </View>

              <Text style={{ fontWeight: '700', marginTop: 12 }}>Quantity</Text>
              <TextInput
                value={qty}
                onChangeText={setQty}
                keyboardType="number-pad"
                style={{ borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' }}
                placeholder="0"
                blurOnSubmit
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#aaa' }}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={posting || !toStoreId || Number(qty) <= 0}
                  onPress={handleSubmit}
                  style={{ backgroundColor: '#000', padding: 14, borderRadius: 12, alignItems: 'center', opacity: (posting || !toStoreId || Number(qty) <= 0) ? 0.6 : 1 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{posting ? 'Transferring…' : 'Transfer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}