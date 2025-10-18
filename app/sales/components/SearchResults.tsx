// app/sales/components/SearchResults.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type Product = { id: string; sku: string; name: string; unit?: string; price_usd?: string | number };

type Props = {
  items: Product[];
  loading?: boolean;
  onAdd: (p: Product) => void;
};

const money = (v: any) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
};

export default function SearchResults({ items, loading, onAdd }: Props) {
  if (loading) {
    return (
      <View style={s.center}>
        <Text>Searching…</Text>
      </View>
    );
  }

  if (!items.length) {
    return <Text style={s.empty}>Search or scan to add products.</Text>;
  }

  return (
    <>
      <View style={[s.row, s.headerRow]}>
        <Text style={[s.cell, s.colSku, s.headerText]}>sku</Text>
        <Text style={[s.cell, s.colName, s.headerText]}>name</Text>
        <Text style={[s.cell, s.colUnit, s.headerText]}>unit</Text>
        <Text style={[s.cell, s.colPrice, s.headerText]}>price_usd</Text>
        <Text style={[s.cell, s.colAct, s.headerText]}>action</Text>
      </View>

      {items.map((item) => {
        const price = typeof item.price_usd === 'string' ? item.price_usd : money(item.price_usd);
        return (
          <View key={item.id} style={[s.row, s.dataRow]}>
            <Text style={[s.cell, s.colSku]} numberOfLines={1}>{item.sku}</Text>
            <Text style={[s.cell, s.colName]} numberOfLines={1}>{item.name}</Text>
            <Text style={[s.cell, s.colUnit]} numberOfLines={1}>{item.unit ?? ''}</Text>
            <Text style={[s.cell, s.colPrice]} numberOfLines={1}>{price}</Text>
            <View style={[s.cell, s.colAct]}>
              <TouchableOpacity style={[s.actBtn, s.addBtn]} onPress={() => onAdd(item)}>
                <Text style={s.actBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },

  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colSku: { flexBasis: '24%', flexGrow: 0, flexShrink: 1 },
  colName: { flexBasis: '24%', flexGrow: 1, flexShrink: 1 },
  colUnit: { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colPrice: { flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colAct: { flexBasis: '12%', flexGrow: 0, flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row' },

  actBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtn: { backgroundColor: '#000' },
  actBtnText: { color: 'white', fontWeight: '800' },
});