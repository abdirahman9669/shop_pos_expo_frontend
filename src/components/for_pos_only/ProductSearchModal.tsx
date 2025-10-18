// src/components/for_pos_only/ProductSearchModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, text, space, radius } from '@/src/theme';

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  unit?: string | null;
  price_usd?: number | string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  fetchProducts: (q: string) => Promise<ProductRow[]>;
  onPick: (p: ProductRow) => void;
  title?: string;
  placeholder?: string;
};

function formatPrice(v: ProductRow['price_usd']) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '';
}

function KeyRow({
  item,
  onPick,
  borderColor,
  colors,
}: {
  item: ProductRow;
  onPick: (p: ProductRow) => void;
  borderColor: string;
  colors: {
    textPrimary: string;
    textSecondary: string;
    primaryBase: string;
  };
}) {
  return (
    <TouchableOpacity
      onPress={() => onPick(item)}
      style={[styles.row, { borderBottomColor: borderColor }]}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={text('body', colors.textPrimary)} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={text('caption', colors.textSecondary)} numberOfLines={1}>
          {item.sku}
          {item.unit ? ` • ${item.unit}` : ''}
          {item.price_usd ? ` • ${formatPrice(item.price_usd)}` : ''}
        </Text>
      </View>
      <Text style={text('label', colors.primaryBase)}>Add</Text>
    </TouchableOpacity>
  );
}

export default function ProductSearchModal({
  visible,
  onClose,
  fetchProducts,
  onPick,
  title = 'Find Products',
  placeholder = 'Search name or SKU…',
}: Props) {
  const { theme: t } = useTheme();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [err, setErr] = useState('');

  const search = useCallback(
    async (qq: string) => {
      setErr('');
      setBusy(true);
      try {
        const list = await fetchProducts(qq);
        setRows(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setErr(e?.message || 'Search failed');
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [fetchProducts]
  );

  // Debounce
  useEffect(() => {
    if (!visible) return;
    const tmr = setTimeout(() => search(q.trim()), 250);
    return () => clearTimeout(tmr);
  }, [q, visible, search]);

  const colors = useMemo(
    () => ({
      textPrimary: t.colors.textPrimary,
      textSecondary: t.colors.textSecondary,
      primaryBase: t.colors.primary.base,
    }),
    [t]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={text('h2', t.colors.textPrimary)}>{title}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              placeholder={placeholder}
              value={q}
              onChangeText={setQ}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface3,
                color: t.colors.textPrimary,
                borderRadius: radius.md,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 12, justifyContent: 'center' }}>
              <Text style={text('label', t.colors.textPrimary)}>Close</Text>
            </TouchableOpacity>
          </View>
          {busy ? (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <ActivityIndicator />
              <Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Searching…</Text>
            </View>
          ) : err ? (
            <Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text>
          ) : null}
        </View>

        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <KeyRow
              item={item}
              onPick={onPick}
              borderColor={t.colors.border}
              colors={colors}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.colors.border }} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            !busy ? (
              <Text style={[text('body', t.colors.textSecondary), { textAlign: 'center', marginTop: 20 }]}>
                Type to search products.
              </Text>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});