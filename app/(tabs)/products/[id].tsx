// app/products/[id].tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Divider, Tag, Button } from '@/src/components';

/* ========= Types from API ========= */
type ProductCategory = { id: string; name: string; parent_id: string | null };
type ProductBarcode = { id: string; code: string };

type Product = {
  id: string;
  shop_id: string;
  sku: string;
  name: string;
  unit: string;
  active: boolean;
  tax_rate: string | number;
  category_id: string | null;
  price_usd: string | number;
  createdAt: string;
  updatedAt: string;
  ProductCategory?: ProductCategory | null;
  ProductBarcodes?: ProductBarcode[];
};

type BatchRow = {
  store_id: string;
  store_name: string | null;
  batch_id: string;
  batch_number: string | null;
  expiry_date: string | null; // ISO or null
  on_hand: number;
};

type ApiResp = {
  ok: boolean;
  product: Product;
  batches: BatchRow[];
  totals: { on_hand: number };
};

/* ===== date helpers & tags ===== */
function monthsUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const years = d.getFullYear() - now.getFullYear();
  const months = years * 12 + (d.getMonth() - now.getMonth());
  const adjust = d.getDate() >= now.getDate() ? 0 : 1;
  return months - adjust;
}
function formatISO(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}
function expiryTag(expiry: string | null) {
  const m = monthsUntil(expiry);
  if (m === null) return <Tag tone="success" label="No expiry" />;
  if (m <= 3) return <Tag tone="danger" label="≤3m" />;
  if (m <= 6) return <Tag tone="warning" label="≤6m" />;
  if (m <= 9) return <Tag tone="info" label="≤9m" />;
  if (m <= 12) return <Tag tone="neutral" label="≤12m" />;
  return null;
}

/* ============ Screen ============ */
export default function ProductDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t } = useTheme();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [totalOnHand, setTotalOnHand] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    // cancel previous
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE}/api/products/${id}`;
      const r = await fetch(url, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        signal: ac.signal,
        cache: 'no-store' as any,
      });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);

      setProduct(j.product);
      setBatches(j.batches || []);
      setTotalOnHand(Number(j.totals?.on_hand || 0));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load');
      setProduct(null);
      setBatches([]);
      setTotalOnHand(0);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const title = product?.name || 'Product';

  const headerRight = useCallback(() => (
    <Button size="sm" title="Edit" variant="ghost" onPress={() => { /* router.push(`/products/${id}/edit`) */ }} />
  ), [id]);

  // Small derivations
  const barcodes = useMemo(() => (product?.ProductBarcodes || []).map(b => b.code), [product]);
  const categoryName = product?.ProductCategory?.name || '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight,
        }}
      />

      <FlatList
        data={batches}
        keyExtractor={(r, i) => `${r.store_id}-${r.batch_id}-${r.expiry_date || 'null'}-${i}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.textSecondary as string}
            colors={[t.colors.primary.base as string]}
            progressBackgroundColor={t.colors.surface as string}
          />
        }
        ListHeaderComponent={
          <View style={{ padding: layout.containerPadding, gap: space.md }}>
            {/* Top card: product summary */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: t.colors.primary.surface,
                  }}
                >
                  <Ionicons name="cube-outline" size={20} color={t.colors.primary.base as string} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={text('h2', t.colors.textPrimary)} numberOfLines={1}>
                    {product?.name || '—'}
                  </Text>
                  <Text style={text('caption', t.colors.textSecondary)}>
                    SKU: {product?.sku || '—'} · Unit: {product?.unit || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={text('caption', t.colors.textSecondary)}>On hand</Text>
                  <Text style={text('h3', t.colors.textPrimary)}>{totalOnHand}</Text>
                </View>
              </View>

              <View style={{ height: space.sm }} />
              <Divider />

              <View style={{ marginTop: space.sm, rowGap: 8 }}>
                <Row label="Category" value={categoryName} />
                <Row label="Price (USD)" value={String(product?.price_usd ?? '—')} />
                <Row label="Tax rate" value={String(product?.tax_rate ?? '—')} />
                <Row
                  label="Barcodes"
                  value={
                    barcodes.length
                      ? barcodes.join(', ')
                      : '—'
                  }
                />
                <Row label="Active" value={product?.active ? 'Yes' : 'No'} />
              </View>
            </Card>

            {/* Section header */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={text('h3', t.colors.textPrimary)}>Batches by store</Text>
                {loading ? <ActivityIndicator /> : null}
              </View>
              {error ? (
                <Text style={[text('body', t.colors.danger.base), { marginTop: 6 }]}>⚠️ {error}</Text>
              ) : null}
            </Card>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: layout.containerPadding }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={text('label', t.colors.textSecondary)}>Store</Text>
                  <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>
                    {item.store_name || 'Unknown'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={text('label', t.colors.textSecondary)}>Batch</Text>
                  <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>
                    {item.batch_number || item.batch_id}
                  </Text>
                </View>

                <View style={{ width: 110 }}>
                  <Text style={text('label', t.colors.textSecondary)}>Expiry</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {expiryTag(item.expiry_date)}
                    <Text style={text('caption', t.colors.textSecondary)}>{formatISO(item.expiry_date)}</Text>
                  </View>
                </View>

                <View style={{ width: 90, alignItems: 'flex-end' }}>
                  <Text style={text('label', t.colors.textSecondary)}>On hand</Text>
                  <Text style={text('h3', t.colors.textPrimary)}>{item.on_hand}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.xs }} />}
        ListEmptyComponent={
          <View style={{ padding: layout.containerPadding }}>
            <Card>
              {loading ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <ActivityIndicator />
                  <Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Loading…</Text>
                </View>
              ) : error ? (
                <Text style={text('body', t.colors.danger.base)}>⚠️ {error}</Text>
              ) : (
                <Text style={text('bodySm', t.colors.textSecondary)}>No batches found.</Text>
              )}
            </Card>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}

/* Small row component for meta */
function Row({ label, value }: { label: string; value: string }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Text style={text('caption', t.colors.textSecondary)}>{label}:</Text>
      <Text style={text('body', t.colors.textPrimary)} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // reserved for future tweaks
});