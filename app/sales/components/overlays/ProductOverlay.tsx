import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TextInput, ActivityIndicator, FlatList, TouchableOpacity, Platform, Keyboard, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import Backdrop from '../Backdrop';
import { Product } from '../../lib/api';
import { money } from '../../lib/math';

export default function ProductOverlay(props: {
  visible: boolean;
  onClose: () => void;
  onAdd: (p: Product) => void | Promise<void>;
  fetchAlphaTop5: () => Promise<Product[]>;
  search: (q: string) => Promise<Product[]>;
  getOnHand: (productId: string) => Promise<number | undefined>;
}) {
  const { visible, onClose, onAdd, fetchAlphaTop5, search, getOnHand } = props;

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [closing, setClosing] = useState(false);
  const [onHandMap, setOnHandMap] = useState<Record<string, number | undefined>>({});

  const inputRef = useRef<TextInput | null>(null);
  const focusTimer = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    focusTimer.current = setTimeout(() => inputRef.current?.focus(), 60);
    return () => { if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = q.trim() ? await search(q.trim()) : await fetchAlphaTop5();
        if (!alive) return;
        setItems(data);

        const ids = data.map(d => d.id);
        (async () => {
          const entries: [string, number | undefined][] = [];
          for (const id of ids) {
            try { entries.push([id, await getOnHand(id)]); } catch { entries.push([id, undefined]); }
          }
          if (!alive) return;
          const m: Record<string, number | undefined> = {};
          for (const [k,v] of entries) m[k] = v;
          setOnHandMap(m);
        })();
      } finally {
        if (alive) setLoading(false);
      }
    };
    const t = setTimeout(run, q.trim() ? 200 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [visible, q, search, fetchAlphaTop5, getOnHand]);

  const safeClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    Keyboard.dismiss();
    setTimeout(() => { onClose(); setClosing(false); }, 80);
  }, [closing, onClose]);

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={safeClose} transparent>
      <View style={styles.overlayWrap}>
        <Backdrop onPress={safeClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          style={{ flex: 1, justifyContent: 'flex-start' }}
        >
          <View style={[styles.overlayCard, { marginTop: 56 }]}>
            <TextInput
              ref={inputRef}
              style={styles.overlayInput}
              placeholder="Search products…"
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loading ? (
              <View style={[styles.center, { paddingVertical: 20 }]}>
                <ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                renderItem={({ item }) => {
                  const price = typeof item.price_usd === 'string'
                    ? money(item.price_usd)
                    : money(Number(item.price_usd || 0));
                  const onHand = onHandMap[item.id];
                  return (
                    <TouchableOpacity style={[styles.row, styles.dataRow]} onPress={async () => { await onAdd(item); }}>
                      <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.cell, { width: 90 }]} numberOfLines={1}>{price}</Text>
                      <Text style={[styles.cell, { width: 110 }]} numberOfLines={1}>
                        {onHand != null ? `on-hand ${onHand}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 380 }}
                ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={safeClose} style={styles.overlayCloseBtn}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayWrap: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  overlayCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  overlayInput: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white', fontWeight: '700', marginBottom: 8 },
  overlayCloseBtn: { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },
  cell: { paddingHorizontal: 4 },
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
});
