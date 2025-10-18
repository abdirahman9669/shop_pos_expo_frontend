import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Picker(props: {
  label: string;
  value: string;
  onOpen: (setList: (v: any[]) => void) => void | Promise<void>;
  onPick: (v: any) => void;
}) {
  const { label, value, onOpen, onPick } = props;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const openModal = useCallback(async () => {
    setOpen(true); setLoading(true);
    try { await onOpen(setList); } finally { setLoading(false); }
  }, [onOpen]);

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.select} onPress={openModal}>
        <Text style={s.selectText}>{value || `Select ${label.toLowerCase()}…`}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 12, flex: 1 }}>
            <Text style={s.title}>Select {label}</Text>
            {loading ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
            ) : (
              <FlatList
                data={list}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[s.row, s.dataRow]} onPress={() => { onPick(item); setOpen(false); }}>
                    <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>
                      {item.label || item.name || item.id}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={s.empty}>No options</Text>}
              />
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

const s = StyleSheet.create({
  title: { fontWeight: '800', fontSize: 20 },
  label: { fontWeight: '700', marginTop: 6 },
  select: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  selectText: { fontWeight: '700' },

  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },
  cell: { paddingHorizontal: 4 },

  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
