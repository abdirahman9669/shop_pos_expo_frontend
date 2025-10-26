// app/products/index.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE } from '@/src/config';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Divider, ListItem, Tag } from '@/src/components';
import { loadAuth } from '@/src/auth/storage';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* =========================
   Types (match API response)
   ========================= */
type StoreBatch = {
  store_id: string | null;
  store_name: string | null;
  batch_id: string;
  batch_number: string | null;
  expiry_date: string | null; // ISO date or null
  on_hand: number;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category_id: string | null;
  total_on_hand: number;
  entries_count: number;
  store_batches: StoreBatch[];
};

type ListApiResponse = {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  data: ProductRow[];
};

type ProductDetailApi = {
  ok: true;
  product: {
    id: string;
    shop_id: string;
    sku: string;
    name: string;
    unit: string;
    active: boolean;
    tax_rate: string; // string from API
    category_id: string | null;
    price_usd: string | number;
    createdAt: string;
    updatedAt: string;
    ProductCategory?: { id: string; name: string; parent_id: string | null } | null;
    ProductBarcodes?: { id: string; code: string }[];
  };
  batches: StoreBatch[];
  totals: { on_hand: number };
};

type Bucket = '3' | '6' | '9' | '12' | 'noexp' | 'all';

/* ==============
   Date utilities
   ============== */
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

// worst (soonest) bucket across a product’s batches
function rowWorstBucket(batches: StoreBatch[]): { bucket: Bucket; hasNoExpiry: boolean } {
  let bucket: Bucket = 'all';
  let hasNoExpiry = false;
  for (const sb of batches) {
    if (sb.on_hand <= 0) continue;
    const m = monthsUntil(sb.expiry_date);
    if (m === null) { hasNoExpiry = true; continue; }
    if (m <= 3) bucket = '3';
    else if (m <= 6 && bucket !== '3') bucket = '6';
    else if (m <= 9 && bucket !== '3' && bucket !== '6') bucket = '9';
    else if (m <= 12 && bucket === 'all') bucket = '12';
  }
  return { bucket, hasNoExpiry };
}

// bucket for ONE batch
function batchBucket(sb: StoreBatch): Bucket {
  const m = monthsUntil(sb.expiry_date);
  if (m === null) return 'noexp';
  if (m <= 3) return '3';
  if (m <= 6) return '6';
  if (m <= 9) return '9';
  if (m <= 12) return '12';
  return 'all';
}

function formatISO(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

/* ===================
   Debounced input hook
   =================== */
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ===========
   Main screen
   =========== */
export default function ProductsIndexPage() {
  const { theme: t } = useTheme();
  const router = useRouter();

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // search & filters
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 350);
  const [bucketFilter, setBucketFilter] = useState<Bucket>('all');

  // modal state
  const [open, setOpen] = useState<ProductRow | null>(null);

  // detail fetch state (for modal)
  const [detail, setDetail] = useState<ProductDetailApi | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Fetch list */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const params: Record<string, string> = { limit: '1000' };
        const q = debounced.trim();
        if (q) params.q = q;

        const qs = new URLSearchParams(params).toString();
        const url = `${API_BASE}/api/product-batches?${qs}`;
        const r = await fetch(url, { headers: await authHeaders() });
        const j: ListApiResponse = await r.json();
        if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
        if (alive) setRows(j.data || []);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [debounced]);

  /* Snapshot counts for chips */
  const snapshot = useMemo(() => {
    let c3 = 0, c6 = 0, c9 = 0, c12 = 0, cNo = 0;
    for (const p of rows) {
      let h3 = false, h6 = false, h9 = false, h12 = false, hNo = false;
      for (const sb of p.store_batches) {
        if (sb.on_hand <= 0) continue;
        const m = monthsUntil(sb.expiry_date);
        if (m === null) { hNo = true; continue; }
        if (m <= 3) h3 = true;
        else if (m <= 6) h6 = true;
        else if (m <= 9) h9 = true;
        else if (m <= 12) h12 = true;
      }
      if (h3) c3++;
      if (h6) c6++;
      if (h9) c9++;
      if (h12) c12++;
      if (hNo) cNo++;
    }
    return { c3, c6, c9, c12, cNo };
  }, [rows]);

  /* Filter for list */
  const filtered = useMemo(() => {
    if (bucketFilter === 'all') return rows;
    return rows.filter(p => {
      const tag = rowWorstBucket(p.store_batches);
      if (bucketFilter === 'noexp') return tag.hasNoExpiry;
      return tag.bucket === bucketFilter;
    });
  }, [rows, bucketFilter]);

  /* Tone helper for batch chip */
  const toneFor = (b: Bucket): 'danger' | 'warning' | 'info' | 'neutral' | 'success' => {
    if (b === '3') return 'danger';
    if (b === '6') return 'warning';
    if (b === '9') return 'info';
    if (b === '12') return 'neutral';
    return 'success'; // noexp
  };

  /* Open modal and fetch /api/products/:id for details */
  const openWithDetail = async (item: ProductRow) => {
    setOpen(item);
    setDetail(null);
    setDetailErr(null);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setDetailLoading(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/products/${encodeURIComponent(item.id)}`,
        { headers: await authHeaders(), signal: ac.signal }
      );
      const j = (await r.json()) as ProductDetailApi;
      if (!r.ok || !(j as any)?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setDetail(j);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setDetailErr(e?.message || 'Failed to load details');
    } finally {
      if (!ac.signal.aborted) setDetailLoading(false);
    }
  };

  /* Render one row (name + qty + expiry chips) */
  const renderRow = ({ item }: { item: ProductRow }) => {
    const { bucket, hasNoExpiry } = rowWorstBucket(item.store_batches);
    const chips: React.ReactNode[] = [];
    if (bucket === '3') chips.push(<Tag key="b3" tone="danger" label="≤3m" />);
    if (bucket === '6') chips.push(<Tag key="b6" tone="warning" label="≤6m" />);
    if (bucket === '9') chips.push(<Tag key="b9" tone="info" label="≤9m" />);
    if (bucket === '12') chips.push(<Tag key="b12" tone="neutral" label="≤12m" />);
    if (hasNoExpiry) chips.push(<Tag key="no" tone="success" label="No expiry" />);

    return (
      <View>
        <ListItem
          title={item.name}
          meta={`${item.total_on_hand}`}
          right={<View style={{ flexDirection: 'row', gap: 6 }}>{chips}</View>}
          onPress={() => openWithDetail(item)}
          left={(
            <View
              style={{
                width: 36, height: 36, borderRadius: 18,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: t.colors.primary.surface,
              }}
            >
              <Ionicons name="cube-outline" size={18} color={t.colors.primary.base as string} />
            </View>
          )}
        />
        <Divider />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Products',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <Button title="+ Product" size="sm" onPress={() => router.push('/products/new')} />
          ),
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View style={{ padding: layout.containerPadding, gap: space.md }}>
            <Card>
              <Text style={text('h2', t.colors.textPrimary)}>Products</Text>
              <View style={{ height: space.sm }} />

              {/* Search */}
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  borderWidth: 1, borderColor: t.colors.border,
                  backgroundColor: t.colors.surface, borderRadius: radius.md,
                  paddingHorizontal: 10, paddingVertical: 8,
                }}
              >
                <Ionicons name="search-outline" size={16} color={t.colors.textSecondary as string} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search products…"
                  placeholderTextColor={t.colors.textSecondary as string}
                  autoCapitalize="none"
                  style={{ flex: 1, color: t.colors.textPrimary }}
                />
              </View>

              {/* Chips / buckets */}
              <View style={{ height: space.sm }} />
              <View style={{ rowGap: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Tag
                    tone={bucketFilter === '3' ? 'danger' : 'neutral'}
                    label={`≤3 mo (${snapshot.c3})`}
                    onPress={() => setBucketFilter(bucketFilter === '3' ? 'all' : '3')}
                  />
                  <Tag
                    tone={bucketFilter === '6' ? 'warning' : 'neutral'}
                    label={`3–6 mo (${snapshot.c6})`}
                    onPress={() => setBucketFilter(bucketFilter === '6' ? 'all' : '6')}
                  />
                  <Tag
                    tone={bucketFilter === '9' ? 'info' : 'neutral'}
                    label={`6–9 mo (${snapshot.c9})`}
                    onPress={() => setBucketFilter(bucketFilter === '9' ? 'all' : '9')}
                  />
                  <Tag
                    tone="neutral"
                    label={`9–12 mo (${snapshot.c12})`}
                    onPress={() => setBucketFilter(bucketFilter === '12' ? 'all' : '12')}
                  />
                  <Tag
                    tone={bucketFilter === 'noexp' ? 'success' : 'neutral'}
                    label={`No expiry (${snapshot.cNo})`}
                    onPress={() => setBucketFilter(bucketFilter === 'noexp' ? 'all' : 'noexp')}
                  />
                </View>
              </View>
            </Card>

            {/* Header row (labels) */}
            <Card>
              <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
                <Text style={[text('label', t.colors.textSecondary), { flex: 1 }]}>Product</Text>
                <Text style={[text('label', t.colors.textSecondary), { width: 80, textAlign: 'right' }]}>
                  On hand
                </Text>
                <Text style={[text('label', t.colors.textSecondary), { width: 140, textAlign: 'right' }]}>
                  Expiry
                </Text>
              </View>
            </Card>
          </View>
        }
        renderItem={(p) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => router.push({ pathname: '/products/[id]', params: { id: p.item.id } })}
            delayLongPress={600}
          >
            {renderRow(p)}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: layout.containerPadding }}>
            <Card>
              {loading ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <ActivityIndicator />
                  <Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Loading…</Text>
                </View>
              ) : err ? (
                <Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text>
              ) : (
                <Text style={text('bodySm', t.colors.textSecondary)}>No products found.</Text>
              )}
            </Card>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: space.xs }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Fixed-size, scrollable modal */}
      <Modal visible={!!open} animationType="fade" transparent onRequestClose={() => setOpen(null)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border },
            ]}
          >
                {/* Modal header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={text('h3', t.colors.textPrimary)} numberOfLines={1}>
                    {detail?.product?.name || open?.name || 'Product'}
                    </Text>
                    <Text style={text('caption', t.colors.textSecondary)} numberOfLines={1}>
                    {detail?.product?.sku || open?.sku}
                    </Text>
                </View>

                {/* 👇 Buttons row */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                    title="Update"
                    variant="secondary"
                    onPress={() => {
                        const id = detail?.product?.id || open?.id;
                        if (id) {
                        setOpen(null); // close modal
                        router.push({ pathname: '/products/update', params: { id } }); // ✅ correct path
                        }
                    }}
                    />

                    <Button title="Close" variant="ghost" onPress={() => setOpen(null)} />
                </View>
                </View>


            {/* Product details block */}
            <View style={{ marginTop: 10 }}>
              {detailLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator />
                  <Text style={text('caption', t.colors.textSecondary)}>Loading details…</Text>
                </View>
              ) : detailErr ? (
                <Text style={text('body', t.colors.danger.base)}>⚠️ {detailErr}</Text>
              ) : detail ? (
                <Card>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                      <Text style={text('label', t.colors.textSecondary)}>Unit:</Text>
                      <Text style={text('label', t.colors.textPrimary)}>{detail.product.unit}</Text>
                      <Text style={text('label', t.colors.textSecondary)}>Active:</Text>
                      <Text style={text('label', t.colors.textPrimary)}>{detail.product.active ? 'Yes' : 'No'}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                      <Text style={text('label', t.colors.textSecondary)}>Tax rate:</Text>
                      <Text style={text('label', t.colors.textPrimary)}>{detail.product.tax_rate}</Text>
                      <Text style={text('label', t.colors.textSecondary)}>Price (USD):</Text>
                      <Text style={text('label', t.colors.textPrimary)}>{String(detail.product.price_usd ?? '—')}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={text('label', t.colors.textSecondary)}>Category:</Text>
                      <Text style={text('label', t.colors.textPrimary)}>
                        {detail.product.ProductCategory?.name ?? '—'}
                      </Text>
                    </View>

                    {!!detail.product.ProductBarcodes?.length && (
                      <View style={{ gap: 6 }}>
                        <Text style={text('label', t.colors.textSecondary)}>Barcodes:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {detail.product.ProductBarcodes.map(b => (
                            <Tag key={b.id} label={b.code} tone="neutral" />
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={text('label', t.colors.textSecondary)}>Total on hand:</Text>
                      <Text style={text('label', t.colors.textPrimary)}>{detail.totals?.on_hand ?? 0}</Text>
                    </View>
                  </View>
                </Card>
              ) : null}
            </View>

            {/* Scrollable batch list */}
            <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 8 }}>
              {(detail?.batches ?? open?.store_batches ?? [])
                .slice()
                .sort((a, b) => {
                  const ax = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
                  const bx = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
                  return ax - bx;
                })
                .map((sb) => {
                  const b = batchBucket(sb);
                  const tone = toneFor(b);
                  const label =
                    b === 'noexp'
                      ? 'No expiry'
                      : b === '3'
                      ? '≤3m'
                      : b === '6'
                      ? '≤6m'
                      : b === '9'
                      ? '≤9m'
                      : '≤12m';
                  return (
                    <Card key={`${sb.batch_id}-${sb.store_id}-${sb.expiry_date || 'null'}`}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={text('caption', t.colors.textSecondary)}>Store</Text>
                          <Text style={text('label', t.colors.textPrimary)} numberOfLines={1}>
                            {sb.store_name || 'Unknown'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={text('caption', t.colors.textSecondary)}>Batch</Text>
                          <Text style={text('label', t.colors.textPrimary)} numberOfLines={1}>
                            {sb.batch_number || sb.batch_id}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={text('caption', t.colors.textSecondary)}>Expiry</Text>
                          <Text style={text('label', t.colors.textPrimary)} numberOfLines={1}>
                            {formatISO(sb.expiry_date)}
                          </Text>
                        </View>
                        <View style={{ width: 80, alignItems: 'flex-end' }}>
                          <Text style={text('caption', t.colors.textSecondary)}>On hand</Text>
                          <Text style={text('h3', t.colors.textPrimary)}>{sb.on_hand}</Text>
                        </View>
                        <Tag label={label} tone={tone} />
                      </View>
                    </Card>
                  );
                })}
              {(!detailLoading && !detailErr && (detail?.batches?.length ?? open?.store_batches?.length ?? 0) === 0) && (
                <Text style={text('bodySm', t.colors.textSecondary)}>No batches for this product.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  // fixed size; content is scrollable inside
  modalCard: {
    width: '92%',
    height: '70%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});