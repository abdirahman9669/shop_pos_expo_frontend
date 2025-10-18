// app/sales/components/LinesTable.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export type Line = {
  product_id: string;
  name: string;
  qty: number;
  unit_price_usd: number;
  lot_summary?: string | null;
};

type Props = {
  lines: Line[];
  onChangeQty: (productId: string, value: string) => void;
  onChangePrice: (productId: string, value: string) => void;
  onPickLot: (line: Line) => void;
  onRemove: (productId: string) => void;
};

const money = (v: any) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
};

export default function LinesTable({
  lines,
  onChangeQty,
  onChangePrice,
  onPickLot,
  onRemove,
}: Props) {
  return (
    <>
      <View style={[s.row, s.headerRow]}>
        <Text style={[s.cell, s.colName2, s.headerText]}>name</Text>
        <Text style={[s.cell, s.colQty, s.headerText]}>qty</Text>
        <Text style={[s.cell, s.colPrice2, s.headerText]}>price</Text>
        <Text style={[s.cell, s.colLot, s.headerText]}>batch • store • exp • on-hand</Text>
        <Text style={[s.cell, s.colTotal, s.headerText]}>total</Text>
        <Text style={[s.cell, s.colActS, s.headerText]}> </Text>
      </View>

      {lines.length === 0 ? (
        <Text style={s.empty}>No lines yet.</Text>
      ) : (
        lines.map((l) => (
          <View key={l.product_id} style={[s.row, s.dataRow]}>
            <Text style={[s.cell, s.colName2]} numberOfLines={1}>{l.name}</Text>
            <TextInput
              style={[s.cellInput, s.colQty]}
              keyboardType="number-pad"
              value={String(l.qty)}
              onChangeText={(v) => onChangeQty(l.product_id, v)}
            />
            <TextInput
              style={[s.cellInput, s.colPrice2]}
              keyboardType="decimal-pad"
              value={String(l.unit_price_usd)}
              onChangeText={(v) => onChangePrice(l.product_id, v)}
            />
            <TouchableOpacity
              style={[s.cell, s.colLot, s.lotBtn]}
              onPress={() => onPickLot(l)}
            >
              <Text numberOfLines={1} style={s.lotText}>
                {l.lot_summary || 'Select batch/store'}
              </Text>
            </TouchableOpacity>
            <Text style={[s.cell, s.colTotal]}>{money(l.qty * l.unit_price_usd)}</Text>
            <View style={[s.cell, s.colActS]}>
              <TouchableOpacity onPress={() => onRemove(l.product_id)} style={s.xBtn}>
                <Text style={{ color: 'white', fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </>
  );
}

const s = StyleSheet.create({
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colName2: { flexBasis: '26%', flexGrow: 1, flexShrink: 1 },
  colQty:   { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colPrice2:{ flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colLot:   { flexBasis: '28%', flexGrow: 1, flexShrink: 1 },
  colTotal: { flexBasis: '14%', flexGrow: 0, flexShrink: 1 },
  colActS:  { flexBasis: '4%',  flexGrow: 0, flexShrink: 0, alignItems: 'flex-end' },

  lotBtn: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white' },
  lotText: { fontWeight: '600', color: '#333' },

  cellInput: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white', marginHorizontal: 4 },

  xBtn: { backgroundColor: 'black', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});