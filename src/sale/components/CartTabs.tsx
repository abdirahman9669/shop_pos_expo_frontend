import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CartSnapshot } from '../lib/types';
import { usdCeil2 } from '../lib/math';

export default function CartTabs(props: {
  activeId: string;
  parked: Record<string, CartSnapshot>;
  activeSubtotal: number;
  activeCount: number;
  onNew: () => void;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const { activeId, parked, activeSubtotal, activeCount, onNew, onSwitch, onClose } = props;

  const pills = Object.values(parked)
    .sort((a, b) => a.created_at - b.created_at)
    .map(snap => {
      const count = (snap.lines || []).reduce((s, l) => s + l.qty, 0);
      const subtotal = (snap.lines || []).reduce((s, l) => s + l.qty * l.unit_price_usd, 0);
      return (
        <View key={snap.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => onSwitch(snap.id)} style={tabStyles.pill}>
            <Text style={tabStyles.pillTxt}>
              {snap.label} · {count} · ${usdCeil2(subtotal).toFixed(2)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onClose(snap.id)} style={tabStyles.closeBtn}>
            <Text style={tabStyles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
      );
    });

  return (
    <View style={tabStyles.wrap}>
      <View style={[tabStyles.pill, { backgroundColor: '#000' }]}>
        <Text style={[tabStyles.pillTxt, { color: '#fff' }]}>
          {activeId} · {activeCount} · ${usdCeil2(activeSubtotal).toFixed(2)}
        </Text>
      </View>
      {pills}
      <TouchableOpacity onPress={onNew} style={tabStyles.addBtn}>
        <Text style={tabStyles.addTxt}>+ New</Text>
      </TouchableOpacity>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' },
  pill: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillTxt: { fontWeight: '800', color: '#333' },
  addBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  addTxt: { color: '#fff', fontWeight: '800' },
  closeBtn: { marginLeft: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontWeight: '900', color: '#333', marginTop: -1 },
});
