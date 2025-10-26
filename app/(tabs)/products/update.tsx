// app/products/update.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Divider } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price_usd?: string | number;
  active: boolean;
  category_id: string | null;
  tax_rate?: string | number;
  ProductCategory?: { id: string; name: string | null; parent_id: string | null };
  ProductBarcodes?: { id: string; code: string }[];
};

type GetResp = {
  ok: boolean;
  product: ProductDetail;
  batches?: any[];
  totals?: any;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

export default function ProductUpdatePage() {
  const { theme: t } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('piece');
  const [price, setPrice] = useState('0');
  const [active, setActive] = useState(true);

  // 🔹 keep the category **id** here
  const [categoryId, setCategoryId] = useState<string>('');

  // barcodes
  const [barcodes, setBarcodes] = useState<string[]>([]);

  // 🔹 categories (for picker)
  const [catsLoading, setCatsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [catModalOpen, setCatModalOpen] = useState(false);

  // derived: selected category name
  const selectedCategoryName = useMemo(
    () => categories.find(c => c.id === categoryId)?.name ?? '—',
    [categories, categoryId]
  );

  // load categories
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatsLoading(true);
        const r = await fetch(`${API_BASE}/api/product-categories`, { headers: await authHeaders() });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        if (!alive) return;
        setCategories(j.data || []);
      } catch (e: any) {
        // don’t block the page, just show empty list
        console.warn('Load categories failed:', e?.message);
      } finally {
        if (alive) setCatsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // load product
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(`${API_BASE}/api/products/${id}`, { headers: await authHeaders() });
        const j: GetResp = await r.json();
        if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);

        if (!alive) return;

        const p = j.product;
        setName(p?.name ?? '');
        setSku(p?.sku ?? '');
        setUnit(p?.unit ?? 'piece');
        setPrice(p?.price_usd != null ? String(p.price_usd) : '0');
        setActive(Boolean(p?.active));

        // 🔹 store **id** (not name) so PATCH works
        setCategoryId(p?.ProductCategory?.id || p?.category_id || '');

        setBarcodes((p?.ProductBarcodes || []).map(b => b.code).filter(Boolean));
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load product');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const canSave = useMemo(() => {
    if (!name || name.trim().length < 2) return false;
    if (!sku || !sku.trim()) return false;
    if (!unit || !unit.trim()) return false;
    if (price !== '' && Number.isNaN(Number(price))) return false;
    return true;
  }, [name, sku, unit, price]);

  const save = async () => {
    try {
      setSaving(true);
      setErr(null);

      const cleanedBarcodes = Array.from(
        new Set(barcodes.map(b => String(b || '').trim()).filter(b => b.length > 0))
      );

      const body = {
        name: name.trim(),
        sku: sku.trim(),
        unit: unit.trim(),
        price_usd: price === '' ? 0 : Number(price),
        active,
        // 🔹 send id (or null)
        category_id: categoryId || null,
        barcodes: cleanedBarcodes,
      };

      const r = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        const msg = j?.message || j?.error || `HTTP ${r.status}`;
        throw new Error(msg);
      }

      Alert.alert('Saved', 'Product updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addBarcode = () => setBarcodes(prev => [...prev, '']);
  const updateBarcode = (i: number, v: string) =>
    setBarcodes(prev => prev.map((b, idx) => (idx === i ? v : b)));
  const removeBarcode = (i: number) =>
    setBarcodes(prev => prev.filter((_, idx) => idx !== i));

  // filter categories in modal
  const filteredCats = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Update Product',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <Button
              title={saving ? 'Saving…' : 'Save'}
              onPress={save}
              disabled={!canSave || saving || loading}
              size="sm"
            />
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>
              Loading…
            </Text>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: layout.containerPadding, gap: space.md, paddingBottom: 40 }}
          >
            {err ? (
              <Card>
                <Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text>
              </Card>
            ) : null}

            <Card>
              <Text style={text('h3', t.colors.textPrimary)}>Basics</Text>
              <View style={{ height: space.sm }} />

              {/* Name */}
              <Text style={text('label', t.colors.textSecondary)}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Product name"
                style={{
                  borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                  paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
                }}
              />

              {/* SKU */}
              <View style={{ height: space.sm }} />
              <Text style={text('label', t.colors.textSecondary)}>SKU</Text>
              <TextInput
                value={sku}
                onChangeText={setSku}
                placeholder="SKU"
                autoCapitalize="characters"
                style={{
                  borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                  paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
                }}
              />

              {/* Unit */}
              <View style={{ height: space.sm }} />
              <Text style={text('label', t.colors.textSecondary)}>Unit</Text>
              <TextInput
                value={unit}
                onChangeText={setUnit}
                placeholder="piece / box / pack…"
                autoCapitalize="none"
                style={{
                  borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                  paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
                }}
              />

              {/* Price */}
              <View style={{ height: space.sm }} />
              <Text style={text('label', t.colors.textSecondary)}>Price (USD)</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                inputMode="decimal"
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                  paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
                }}
              />

              {/* Active */}
              <View style={{ height: space.sm }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={text('label', t.colors.textSecondary)}>Active</Text>
                <Switch value={active} onValueChange={setActive} />
              </View>

              {/* Category (selector) */}
              <View style={{ height: space.sm }} />
              <Text style={text('label', t.colors.textSecondary)}>Category</Text>
              <TouchableOpacity
                onPress={() => setCatModalOpen(true)}
                activeOpacity={0.8}
                style={{
                  borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                  backgroundColor: t.colors.surface,
                  paddingHorizontal: 12, paddingVertical: 12,
                }}
              >
                <Text style={text('body', t.colors.textPrimary)}>
                  {catsLoading ? 'Loading…' : selectedCategoryName}
                </Text>
              </TouchableOpacity>
              {!!categoryId && (
                <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
                  <Button
                    title="Clear category"
                    variant="ghost"
                    size="sm"
                    onPress={() => setCategoryId('')}
                  />
                </View>
              )}
            </Card>

            {/* Barcodes */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={text('h3', t.colors.textPrimary)}>Barcodes</Text>
                <Button title="Add" size="sm" variant="secondary" onPress={addBarcode} />
              </View>

              <View style={{ height: space.sm }} />
              {barcodes.length === 0 ? (
                <Text style={text('caption', t.colors.textSecondary)}>
                  No barcodes. Tap “Add” to include one.
                </Text>
              ) : null}

              {barcodes.map((code, i) => (
                <View key={i} style={{ marginBottom: space.sm }}>
                  <Text style={text('label', t.colors.textSecondary)}>Code #{i + 1}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      value={code}
                      onChangeText={(v) => updateBarcode(i, v)}
                      placeholder="barcode / URL"
                      autoCapitalize="none"
                      style={{
                        flex: 1,
                        borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                        paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
                      }}
                    />
                    <Button title="Remove" variant="ghost" onPress={() => removeBarcode(i)} />
                  </View>
                  {i < barcodes.length - 1 ? (
                    <View style={{ marginTop: space.sm }}>
                      <Divider />
                    </View>
                  ) : null}
                </View>
              ))}
            </Card>

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
              <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
              <Button title={saving ? 'Saving…' : 'Save changes'} onPress={save} disabled={!canSave || saving} />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Category picker modal */}
      <Modal visible={catModalOpen} animationType="slide" transparent onRequestClose={() => setCatModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={text('h3', t.colors.textPrimary)}>Select category</Text>
              <Button title="Close" variant="ghost" onPress={() => setCatModalOpen(false)} />
            </View>

            <View style={{ height: space.sm }} />
            <TextInput
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder="Search categories…"
              autoCapitalize="none"
              style={{
                borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              }}
            />

            <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 8 }}>
              {filteredCats.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setCategoryId(c.id);
                    setCatModalOpen(false);
                  }}
                  style={{
                    borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                    paddingHorizontal: 12, paddingVertical: 12,
                    backgroundColor: c.id === categoryId ? t.colors.primary.surface : t.colors.surface,
                  }}
                >
                  <Text style={text('body', t.colors.textPrimary)}>{c.name}</Text>
                  {c.parent_id ? (
                    <Text style={text('caption', t.colors.textSecondary)}>Child of {c.parent_id}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}

              {filteredCats.length === 0 && (
                <Text style={text('caption', t.colors.textSecondary)}>No categories found.</Text>
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
  modalCard: {
    width: '92%',
    height: '70%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});