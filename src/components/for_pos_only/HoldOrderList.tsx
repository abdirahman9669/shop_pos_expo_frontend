import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { useTheme, text, space, radius, elevation } from '@/src/theme';

export type HeldOrder = {
  id: string;
  label: string;              // e.g. “Table 4” / “Walk-in #3”
  created_at: string;         // ISO
  items_count: number;
  total_usd: number;
};

export function HoldOrderList({
  visible,
  onClose,
  orders,
  onResume,
  onDelete,
  title = 'Held Orders',
}: {
  visible: boolean;
  onClose: () => void;
  orders: HeldOrder[];
  onResume: (id: string) => void;
  onDelete?: (id: string) => void;
  title?: string;
}) {
  const { theme: t } = useTheme();

  const Row = ({ item }: { item: HeldOrder }) => (
    <View style={[styles.row, { borderColor: t.colors.border, backgroundColor: t.colors.surface3 }]}>
      <View style={{ flex: 1 }}>
        <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>{item.label}</Text>
        <Text style={text('caption', t.colors.textSecondary)}>
          {item.items_count} items • ${item.total_usd.toFixed(2)} • {item.created_at.replace('T', ' ').slice(0, 19)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => onResume(item.id)} style={[styles.btn, { backgroundColor: t.colors.primary.base }]}>
          <Text style={text('label', t.colors.primary.onBase)}>Resume</Text>
        </TouchableOpacity>
        {onDelete ? (
          <TouchableOpacity onPress={() => onDelete(item.id)} style={[styles.btn, { backgroundColor: t.colors.danger.base }]}>
            <Text style={text('label', t.colors.danger.onBase)}>Delete</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={[styles.header, { backgroundColor: t.colors.surface, borderBottomColor: t.colors.border }]}>
          <Text style={text('h2', t.colors.textPrimary)}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={[styles.hBtn, { borderColor: t.colors.border }]}>
            <Text style={text('label', t.colors.textPrimary)}>Close</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={orders}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <Row item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={[text('body', t.colors.textSecondary), { textAlign: 'center', marginTop: 20 }]}>
              No held orders.
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { padding: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
});
