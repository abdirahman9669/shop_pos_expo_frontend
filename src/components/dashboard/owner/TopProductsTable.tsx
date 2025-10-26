// src/components/dashboard/owner/TopProductsTable.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Divider, Tag } from '@/src/components';
import { useTheme, text, space, radius } from '@/src/theme';

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

  const RankBadge = ({ rank }: { rank: number }) => {
    // Subtle color hints for top 3, otherwise neutral
    const colorForRank =
      rank === 1
        ? (t.colors.warning.base as string)
        : rank === 2
        ? (t.colors.textSecondary as string)
        : rank === 3
        ? (t.colors.primary.base as string)
        : (t.colors.textSecondary as string);

    const iconName =
      rank === 1 ? 'medal-outline'
      : rank === 2 ? 'medal-outline'
      : rank === 3 ? 'medal-outline'
      : 'trophy-outline';

    return (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.surface2,
        }}
      >
        <MaterialCommunityIcons name={iconName as any} size={18} color={colorForRank} />
      </View>
    );
  };

  const Row = ({ item, index }: { item: Item; index: number }) => {
    const name = item?.Product?.name || '—';
    const sku = item?.Product?.sku || '—';
    const qty = item?.total_qty ?? 0;
    const revenue = `$${(item?.total_revenue ?? 0).toFixed(2)}`;

    return (
      <Pressable
        onPress={() => onPress?.(item.product_id)}
        android_ripple={{ color: t.colors.border }}
        style={({ pressed }) => ({
          paddingVertical: 10,
          paddingHorizontal: 2,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Rank medal */}
          <RankBadge rank={index + 1} />

          {/* Main text */}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={text('body', t.colors.textPrimary)}>
              {index + 1}. {name}
            </Text>
            <View style={{ height: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: radius.sm,
                  backgroundColor: t.colors.surface3,
                }}
              >
                <Ionicons name="barcode-outline" size={12} color={t.colors.textSecondary as string} />
                <Text style={text('caption', t.colors.textSecondary)}>SKU {sku}</Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: radius.sm,
                  backgroundColor: t.colors.surface3,
                }}
              >
                <MaterialCommunityIcons name="counter" size={12} color={t.colors.textSecondary as string} />
                <Text style={text('caption', t.colors.textSecondary)}>Qty {qty}</Text>
              </View>
            </View>
          </View>

          {/* Right meta: revenue */}
          <Tag tone="neutral" label={revenue} />
        </View>
      </Pressable>
    );
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.xs }}>
        <MaterialCommunityIcons
          name="crown-outline"
          size={18}
          color={t.colors.textSecondary as string}
        />
        <Text style={text('h3', t.colors.textPrimary)}>Top Products</Text>
      </View>

      {!items?.length ? (
        <Text style={text('bodySm', t.colors.textSecondary)}>No products in range.</Text>
      ) : (
        <View>
          {items.map((item, index) => (
            <View key={item.product_id}>
              <Row item={item} index={index} />
              {index < items.length - 1 && <Divider />}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}