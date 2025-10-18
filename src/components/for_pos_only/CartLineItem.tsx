// src/components/for_pos_only/CartLineItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, text, space, radius } from '@/src/theme';
import { IconButton } from '@/src/components';

export type CartLineItemProps = {
  name: string;
  sku?: string | null;

  // numbers may be missing in preview/demo flows → treat as 0
  qty?: number;               // default 0
  unitPriceUsd?: number;      // default 0

  editable?: boolean;
  note?: string;

  onInc?: () => void;
  onDec?: () => void;
  onRemove?: () => void;
};

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const money = (v: unknown) => n(v).toFixed(2);

export function CartLineItem({
  name,
  sku,
  qty,
  unitPriceUsd,
  editable = true,
  note,
  onInc,
  onDec,
  onRemove,
}: CartLineItemProps) {
  const { theme: t } = useTheme();

  const q = n(qty);
  const price = n(unitPriceUsd);
  const lineTotal = q * price;

  return (
    <View style={[styles.row, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>{name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {sku ? <Text style={text('caption', t.colors.textSecondary)}>SKU {sku}</Text> : null}
          {note ? <Text style={text('caption', t.colors.textSecondary)} numberOfLines={1}>• {note}</Text> : null}
        </View>
        <Text style={text('caption', t.colors.textSecondary)}>
          {q} × ${money(price)} = ${money(lineTotal)}
        </Text>
      </View>

      {editable ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconButton variant="neutral" size="sm" onPress={onDec}>
            <Text style={text('label', t.colors.neutral.onBase)}>-</Text>
          </IconButton>
          <Text style={text('label', t.colors.textPrimary)}>{q}</Text>
          <IconButton variant="neutral" size="sm" onPress={onInc}>
            <Text style={text('label', t.colors.neutral.onBase)}>+</Text>
          </IconButton>

          <TouchableOpacity onPress={onRemove} style={[styles.remove, { borderColor: t.colors.border }]}>
            <Text style={text('label', t.colors.danger.base)}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={text('label', t.colors.textPrimary)}>${money(lineTotal)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  remove: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});

export default CartLineItem;