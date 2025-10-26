// app/customers/receivables.tsx (or your current path)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Divider, ListItem, Tag, SegmentedControl } from '@/src/components';
import NewCustomerModal from '../customers/NewCustomerModal';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Row = {
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  balance_usd: number;
  a0_30?: number; a31_60?: number; a61_90?: number; a90_plus?: number;
};
type ApiResp = { ok: boolean; count: number; rows: Row[] };

const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};

export default function CustomersReceivablesScreen() {
  const { theme: t } = useTheme();
  const router = useRouter();

  // modal
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // filters
  const [withAging, setWithAging] = useState(false);
  const [search, setSearch] = useState('');

  // data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const total = useMemo(
    () => rows.reduce((s, r) => s + Number(r.balance_usd || 0), 0),
    [rows]
  );

  const load = useCallback(async () => {
    setErr(''); setLoading(true);
    try {
      const qs = new URLSearchParams(withAging ? { with_aging: '1' } : {}).toString();
      const url = `${API_BASE}/api/customers/allWithBalance${qs ? `?${qs}` : ''}`;
      const r = await fetch(url, { headers: AUTH });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load'); setRows([]);
    } finally { setLoading(false); }
  }, [withAging]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => (`${r.customer_name} ${r.customer_phone || ''}`).toLowerCase().includes(q));
  }, [rows, search]);

  const handleCreated = useCallback(() => {
    setShowNewCustomer(false);
    load(); // refresh after creating
  }, [load]);

  const renderRow = ({ item }: { item: Row }) => {
    const Left = (
      <View
        style={{
          width: 36, height: 36, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: t.colors.primary.surface,
        }}
      >
        <Ionicons name="person-outline" size={18} color={t.colors.primary.base as string} />
      </View>
    );

    const rightAging = withAging ? (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Tag tone="neutral" label={money(item.a0_30)} />
        <Tag tone="neutral" label={money(item.a31_60)} />
        <Tag tone="neutral" label={money(item.a61_90)} />
        <Tag tone="neutral" label={money(item.a90_plus)} />
      </View>
    ) : undefined;

    return (
      <View>
        <ListItem
          left={Left}
          title={item.customer_name}
          subtitle={item.customer_phone || undefined}
          meta={!withAging ? `$${money(item.balance_usd)}` : undefined}
          right={withAging ? rightAging : undefined}
          onPress={() => router.push({ pathname: '/customers/[id]', params: { id: item.customer_id, name: item.customer_name } })}
        />
        <Divider />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Receivables',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <Button
              title="+ New"
              size="sm"
              onPress={() => setShowNewCustomer(true)}
            />
          ),
        }}
      />

      {/* New Customer modal */}
      <NewCustomerModal
        visible={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onCreated={handleCreated}
      />

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.customer_id}
        refreshing={refreshing}
        onRefresh={load}
        ListHeaderComponent={
          <View style={{ padding: layout.containerPadding, gap: space.lg }}>
            {/* Title/Search/Aging */}
            <Card>
              <Text style={text('h2', t.colors.textPrimary)}>Customers (Receivables)</Text>
              <View style={{ height: space.sm }} />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={text('label', t.colors.textSecondary)}>Search</Text>
                  <View
                    style={{
                      marginTop: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.surface,
                      borderRadius: radius.md,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      gap: 8,
                    }}
                  >
                    <Ionicons name="search-outline" size={16} color={t.colors.textSecondary as string} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search name / phone…"
                      placeholderTextColor={t.colors.textSecondary as string}
                      autoCapitalize="none"
                      style={{ flex: 1, color: t.colors.textPrimary }}
                    />
                  </View>
                </View>

                <View style={{ width: 8 }} />

                <View style={{ flex: 1 }}>
                  <Text style={text('label', t.colors.textSecondary)}>Aging</Text>
                  <View style={{ height: 6 }} />
                  <SegmentedControl
                    value={withAging ? 'on' : 'off'}
                    onChange={(v) => setWithAging(v === 'on')}
                    segments={[
                      { value: 'off', label: 'OFF' },
                      { value: 'on',  label: 'ON'  },
                    ]}
                  />
                </View>
              </View>

              {/* Totals */}
              <View style={{ height: space.sm }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tag tone="info" label={`Total (USD): ${money(total)}`} />
                <Tag tone="neutral" label={`${filtered.length} customers`} />
              </View>
            </Card>

            {/* Columns helper when aging is ON */}
            {withAging ? (
              <Card>
                <Text style={text('label', t.colors.textSecondary)}>Columns</Text>
                <View style={{ height: 6 }} />
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Tag tone="neutral" label="0–30" />
                  <Tag tone="neutral" label="31–60" />
                  <Tag tone="neutral" label="61–90" />
                  <Tag tone="neutral" label="90+" />
                  <Tag tone="success" label="Balance" />
                </View>
              </Card>
            ) : null}

            {/* Error */}
            {err ? (
              <Card>
                <Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text>
              </Card>
            ) : null}

            {/* Header for list */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="people-outline" size={18} color={t.colors.textSecondary as string} />
                <Text style={text('h3', t.colors.textPrimary)}>Customers</Text>
              </View>
            </Card>
          </View>
        }
        renderItem={renderRow}
        ListFooterComponent={
          <View style={{ padding: layout.containerPadding }}>
            <Card>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={text('label', t.colors.textPrimary)}>Total (USD): {money(total)}</Text>
              </View>
            </Card>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: space.xs }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}