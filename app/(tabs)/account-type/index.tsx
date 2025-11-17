// app/(shell)/account-type/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, ListItem, Divider, Tag } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type BalanceRow = {
  id: string;
  name: string;
  normal_side: 'debit' | 'credit';
  accounts_count: number;
  balance_usd: number;
};

const safeErr = (e: any) => {
  if (typeof e === 'string') return e;
  if (e?.message) return String(e.message);
  try { return JSON.stringify(e); } catch { return String(e); }
};

export default function AccountTypesIndex() {
  const { theme: t } = useTheme();
  const router = useRouter();

  // filters
  const [from, setFrom] = useState('2025-01-01');
  const [to, setTo] = useState('2025-12-31');
  const [q, setQ] = useState('');

  // data
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (q.trim()) u.set('q', q.trim());
    if (from) u.set('from', from);
    if (to) u.set('to', to);
    return u.toString();
  }, [q, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/account-types/with-balances?${qs}`, {
        headers: await authHeaders(),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      const list: BalanceRow[] = j?.data ?? [];
      setRows(list);
    } catch (e) {
      setErr(safeErr(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { load(); }, [load]);

  const toneFor = (side: 'debit'|'credit'): 'success'|'warning' => (side === 'debit' ? 'success' : 'warning');

  return (
    <View style={{ flex: 1, paddingHorizontal: layout.containerPadding, paddingTop: space.md, paddingBottom: space.md }}>
      {/* Header / Filters */}
      <Card>
        <View style={{ gap: space.sm }}>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.colors.textSecondary as string}
            style={{
              borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
              paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              backgroundColor: t.colors.surface,
            }}
          />
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.colors.textSecondary as string}
            style={{
              borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
              paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              backgroundColor: t.colors.surface,
            }}
          />

          {/* optional name filter */}
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search account type…"
            placeholderTextColor={t.colors.textSecondary as string}
            style={{
              borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
              paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              backgroundColor: t.colors.surface,
            }}
            autoCapitalize="none"
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={loading ? 'Loading…' : 'Load'} onPress={load} disabled={loading} />
            <Button title="+ New" variant="secondary" onPress={() => router.push('/account-type/new' as const)} />
          </View>

          {err ? (
            <Pressable onPress={load} style={{ paddingVertical: 8 }}>
              <Tag tone="warning" label={`⚠ ${err}`} />
              <View style={{ height: 4 }} />
              <Tag tone="neutral" label="Tap to retry" />
            </Pressable>
          ) : null}
        </View>
      </Card>

      {/* Table header */}
      <Card style={{ marginTop: space.md, paddingVertical: 8, paddingHorizontal: layout.cardPadding }}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={[text('label', t.colors.textSecondary), { flex: 1 }]}>Name</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 70, textAlign: 'right' }]}>Side</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 90, textAlign: 'right' }]}>Accounts</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 120, textAlign: 'right' }]}>Balance USD</Text>
        </View>
      </Card>

      {/* List */}
      <Card style={{ paddingHorizontal: 0, paddingVertical: 0, marginTop: space.sm }}>
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <>
              <Pressable
                onPress={() => router.push({ pathname: '/account-type/[id]', params: { id: item.id } })}
                android_ripple={{ color: t.colors.border as string }}
                style={{ borderRadius: 10 }}
                hitSlop={8}
              >
                <View pointerEvents="none">
                  <ListItem
                    title={item.name}
                    subtitle={undefined}
                    left={<Tag tone={toneFor(item.normal_side)} label={item.normal_side.toUpperCase()} />}
                    right={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <Text style={text('label', t.colors.textSecondary)}>{item.accounts_count}</Text>
                        <Text style={text('label', t.colors.textPrimary)}>${(Number(item.balance_usd) || 0).toFixed(2)}</Text>
                      </View>
                    }
                  />
                </View>
              </Pressable>
              <Divider />
            </>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={{ padding: layout.cardPadding }}>
                <Tag tone="neutral" label="No data for this range." />
              </View>
            )
          }
          contentContainerStyle={{ paddingHorizontal: layout.cardPadding, paddingTop: 4, paddingBottom: 6 }}
        />
      </Card>
    </View>
  );
}