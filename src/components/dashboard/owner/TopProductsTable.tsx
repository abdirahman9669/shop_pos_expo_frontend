// src/components/dashboard/owner/TopProductsTable.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Card, Divider, ListItem, Tag } from '@/src/components';
import { useTheme, text, space } from '@/src/theme';

type Item = {
  product_id: string;
  total_revenue: number;
  total_qty: number;
  Product: { id: string; name: string; sku: string };
};

export default function TopProductsTable({
  items,
  onPress,
}: {
  items: Item[];
  onPress?: (id: string) => void;
}) {
  const { theme: t } = useTheme();

  return (
    <Card>
      <Text style={text('h3', t.colors.textPrimary)}>Top Products</Text>
      <View style={{ height: space.xs }} />

      {!items?.length ? (
        <Text style={text('bodySm', t.colors.textSecondary)}>No products in range.</Text>
      ) : (
        <View>
          {items.map((item, index) => (
            <View key={item.product_id}>
              <ListItem
                title={`${index + 1}. ${item.Product?.name || '—'}`}
                subtitle={`SKU ${item.Product?.sku || '—'} • Qty ${item.total_qty}`}
                meta={`$${item.total_revenue.toFixed(2)}`}
                onPress={() => onPress?.(item.product_id)}
                
              />
              {index < items.length - 1 && <Divider />}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}