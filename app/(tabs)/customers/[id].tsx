// app/customer/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, FlatList, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Divider, ListItem, Tag, SegmentedControl } from '@/src/components';
import UpdateCustomerModal from './UpdateCustomerModal';
import { DateInput } from '@/src/components/DateInput';   // ← NEW reusable date input

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Tx = {
  id: string;
  date: string;
  createdAt: string;
  reference_type: 'SALE'|'SALE_PAYMENT'|'PAYMENT'|'RETURN'|string;
  reference_id: string;
  debit_account:  { id: string; name: string } | null;
  credit_account: { id: string; name: string } | null;
  amount_usd: number;
  native_amount: number | null;
  native_currency: string | null;
  direction: 'DEBIT' | 'CREDIT';
  signed_amount_usd: number;
  running_balance_usd?: number;
};

type ApiResp = {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  customer: { id: string; name: string | null; phone: string | null; note?: string | null; createdAt: string; updatedAt: string };
  data: Tx[];
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const money = (v: any, dp = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(dp) : (0).toFixed(dp);
};
const shortRef = (t: string, id: string) => `${t} ${id.slice(0, 8)}`;

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t } = useTheme();

  const [showEdit, setShowEdit] = useState(false);
  const [customer, setCustomer] = useState<ApiResp['customer'] | null>(null);

  // filters
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState(ymd(jan1));
  const [to, setTo] = useState(ymd(today));
  const [qType, setQType] = useState<'ALL'|'SALE'|'SALE_PAYMENT'|'PAYMENT'|'RETURN'>('ALL');
  const [includeRunning, setIncludeRunning] = useState(true);

  // data
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const total = useMemo(
    () => rows.reduce((s, r) => s + (r.signed_amount_usd || 0), 0),
    [rows]
  );

  const load = useCallback(async () => {
    if (!id) return;
    setErr(''); setLoading(true);
    try {
      const params: Record<string, string> = {
        from, to, limit: '200', order: 'date', dir: 'DESC',
        include_running: includeRunning ? 'true' : 'false',
      };
      if (qType !== 'ALL') params.type = qType;

      const qs = new URLSearchParams(params).toString();
      const url = `${API_BASE}/api/customers/${id}/transactions?${qs}`;
      const r = await fetch(url, { headers: AUTH });
      const j: ApiResp = await r.json();
      if (!r.ok || !j?.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`);

      setRows(j.data || []);
      setCustomer(j.customer || null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [id, from, to, qType, includeRunning]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = useCallback((cust: any) => {
    setCustomer(c => ({ ...(c || { id: id! } as any), ...cust }));
    load();
  }, [id, load]);

  const headerRight = () => (
    <TouchableOpacity
      onPress={() => setShowEdit(true)}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: t.colors.primary.base,
      }}
    >
      <Text style={[text('label', t.colors.primary.onBase as string)]}>Update</Text>
    </TouchableOpacity>
  );

  // Top “header” area that will sit above the list and scroll with it
  const ListHeader = () => (
    <View style={{ padding: layout.containerPadding, gap: space.lg }}>
      {/* Summary */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 42, height: 42, borderRadius: 21,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: t.colors.primary.surface,
            }}
          >
            <Ionicons name="person-circle-outline" size={22} color={t.colors.primary.base as string} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={text('h3', t.colors.textPrimary)} numberOfLines={1}>
              {customer?.name || '—'}
            </Text>
            <Text style={text('caption', t.colors.textSecondary)} numberOfLines={1}>
              {customer?.phone || 'No phone'}
            </Text>
          </View>
          {customer?.note ? (
            <Tag tone="info" label="Has note" />
          ) : (
            <Tag tone="neutral" label="No note" />
          )}
        </View>
        {customer?.note ? (
          <Text style={[text('bodySm', t.colors.textSecondary), { marginTop: 6 }]}>
            {customer.note}
          </Text>
        ) : null}
      </Card>

      {/* Filters */}
      <Card>
        <Text style={text('h3', t.colors.textPrimary)}>Filters</Text>
        <View style={{ height: space.xs }} />

        {/* Dates */}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <DateInput label="From" value={from} onChange={setFrom} />
          <DateInput label="To"   value={to}   onChange={setTo}   />
        </View>

        <View style={{ height: space.sm }} />

        {/* Type + running */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text style={text('label', t.colors.textSecondary)}>Type:</Text>
          <SegmentedControl
            value={qType}
            onChange={(v) => setQType(v as any)}
            segments={[
              { value: 'ALL', label: 'All' },
              { value: 'SALE', label: 'Sale' },
              { value: 'SALE_PAYMENT', label: 'Sale Pay' },
              { value: 'PAYMENT', label: 'Payment' },
              { value: 'RETURN', label: 'Return' },
            ]}
          />
          <View style={{ flex: 1 }} />
          <Button
            title={includeRunning ? 'Running: ON' : 'Running: OFF'}
            variant={includeRunning ? 'solid' : 'ghost'}
            onPress={() => setIncludeRunning(v => !v)}
            size="sm"
          />
          <Button title={loading ? 'Loading…' : 'Reload'} onPress={load} size="sm" />
        </View>
      </Card>

      {/* Transactions title row */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs }}>
          <Text style={text('h3', t.colors.textPrimary)}>Transactions</Text>
          <Tag tone="neutral" label={`${rows.length} rows`} />
        </View>

        {err ? (
          <Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text>
        ) : loading && rows.length === 0 ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Loading…</Text>
          </View>
        ) : null}
      </Card>
    </View>
  );

  const renderItem = ({ item }: { item: Tx }) => {
    const amtColor = item.signed_amount_usd >= 0 ? t.colors.success.base : t.colors.danger.base;
    return (
      <View style={{ paddingHorizontal: layout.containerPadding }}>
        <Card>
          <ListItem
            title={`${item.date.slice(0, 10)} • ${shortRef(item.reference_type, item.reference_id)}`}
            subtitle={`${item.debit_account?.name || '?'} → ${item.credit_account?.name || '?'}`
            }
            meta={<Text style={[text('label', amtColor as string)]}>{money(item.signed_amount_usd)}</Text>}
          />
          {includeRunning ? (
            <>
              <Divider />
              <View style={{ paddingTop: 8 }}>
                <Tag tone="neutral" label={`running: ${money(item.running_balance_usd ?? 0)}`} />
              </View>
            </>
          ) : null}
        </Card>
      </View>
    );
  };

  const ListFooter = () => (
    !loading && rows.length > 0 ? (
      <View style={{ paddingHorizontal: layout.containerPadding, paddingBottom: 24 }}>
        <Card>
          <Text style={text('label', t.colors.textPrimary)}>Net change (USD): {money(total)}</Text>
        </Card>
      </View>
    ) : <View style={{ height: 24 }} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: customer?.name || 'Customer',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight,
        }}
      />

      {/* One FlatList drives the whole page scroll */}
      <FlatList
        data={rows}
        keyExtractor={(tx, i) => `${tx.id}:${tx.createdAt}:${i}`}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        contentContainerStyle={{ paddingBottom: 12 }}
      />

      {/* Update modal */}
      {id ? (
        <UpdateCustomerModal
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          onUpdate={handleUpdated}
          customerId={id}
          initial={{
            name:  customer?.name  ?? '',
            phone: customer?.phone ?? '',
            note:  customer?.note  ?? '',
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}