// app/(shell)/account-type/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, TextInput, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, ListItem, Divider, Tag } from '@/src/components';

/* ---------- auth headers ---------- */
async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/* ---------- types ---------- */
type TypeRow = { id: string; name: string; normal_side: 'debit'|'credit' };
type WithBalancesRow = { id: string; name: string; normal_side: 'debit'|'credit'; accounts_count: number; balance_usd: number };
type AccountRow = {
  id: string;
  name: string;
  type?: string;
  normal_side?: 'debit'|'credit';
  active?: boolean;
  balance_usd?: number;
  createdAt?: string;
};

/* ---------- utils ---------- */
const money = (v: any, d = 2) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d);
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const safeErr = (e: any) => {
  if (typeof e === 'string') return e;
  if (e?.message) return String(e.message);
  try { return JSON.stringify(e); } catch { return String(e); }
};
const toneForSide = (s: 'debit'|'credit'): 'success'|'warning' => (s === 'debit' ? 'success' : 'warning');

/* ---------- page ---------- */
export default function AccountTypeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t } = useTheme();
  const router = useRouter();

  // header info (type + summary)
  const [loadingHead, setLoadingHead] = useState(true);
  const [headErr, setHeadErr] = useState<string | null>(null);
  const [row, setRow] = useState<TypeRow | null>(null);
  const [agg, setAgg] = useState<WithBalancesRow | null>(null);

  // filters for accounts list
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState(ymd(jan1));
  const [to, setTo] = useState(ymd(today));
  const [activeOnly, setActiveOnly] = useState(true);

  // accounts list
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [rows, setRows] = useState<AccountRow[]>([]);

  // total (client-side sum) for the accounts list
  const totalUsd = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.balance_usd) || 0), 0),
    [rows]
  );

  // Load header data (type + with-balances)
  const loadHeader = useCallback(async () => {
    if (!id) return;
    setLoadingHead(true);
    setHeadErr(null);
    try {
      // 1) base type (in case you don’t expose GET /:id)
      const r = await fetch(`${API_BASE}/api/account-types`, { headers: await authHeaders() });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      const found: TypeRow | undefined = (j?.data ?? []).find((x: TypeRow) => x.id === id);
      setRow(found ?? null);

      // 2) with-balances (no date filter here; page-level summary)
      const rb = await fetch(`${API_BASE}/api/account-types/with-balances`, { headers: await authHeaders() });
      const jb = await rb.json().catch(() => ({}));
      if (rb.ok && jb?.ok !== false) {
        const foundB: WithBalancesRow | undefined = (jb?.data ?? []).find((x: WithBalancesRow) => x.id === id);
        setAgg(foundB ?? null);
      }
    } catch (e) {
      setRow(null);
      setAgg(null);
      setHeadErr(safeErr(e));
    } finally {
      setLoadingHead(false);
    }
  }, [id]);

  // Load accounts for the type (with filters)
  const loadAccounts = useCallback(async () => {
    if (!id) return;
    setLoadingList(true);
    setListErr(null);
    try {
      const qs = new URLSearchParams({
        type_id: String(id),
        active: String(activeOnly),
        from,
        to,
        limit: '200',
      }).toString();
      const url = `${API_BASE}/api/accounts/with-balances?${qs}`;
      const r = await fetch(url, { headers: await authHeaders() });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j?.data ?? []);
    } catch (e) {
      setRows([]);
      setListErr(safeErr(e));
    } finally {
      setLoadingList(false);
    }
  }, [id, from, to, activeOnly]);

  useEffect(() => { loadHeader(); }, [loadHeader]);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  return (
    <View style={{ flex: 1, paddingHorizontal: layout.containerPadding, paddingTop: space.md, paddingBottom: space.md }}>
      {/* ---------- Header card: Type info + Update ---------- */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <View style={{ marginBottom: 6 }}>
              <Tag tone={row ? toneForSide(row.normal_side) : 'neutral'} label={row ? row.normal_side.toUpperCase() : '…'} />
            </View>
            <View>
              <Tag tone="neutral" label={row?.name ?? 'Account Type'} />
            </View>
            {headErr ? (
              <View style={{ marginTop: 8 }}>
                <Tag tone="warning" label={`⚠ ${headErr}`} />
              </View>
            ) : null}
          </View>

          <Button
            title="Update"
            size="sm"
            onPress={() => router.push({ pathname: '/account-type/update', params: { id } })}
          />
        </View>

        <Divider />

        {/* Summary (accounts count + balance USD from /with-balances) */}
        {loadingHead ? (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <ActivityIndicator />
          </View>
        ) : agg ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Tag tone="neutral" label={`Accounts: ${agg.accounts_count}`} />
            <Tag tone="info" label={`Balance (USD): ${money(agg.balance_usd)}`} />
          </View>
        ) : null}
      </Card>

      {/* ---------- Filters card ---------- */}
      <View style={{ height: space.md }} />
      <Card>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
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
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
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
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag tone="neutral" label="Active only" />
              <Switch value={activeOnly} onValueChange={setActiveOnly} />
            </View>
            <Button
              title={loadingList ? 'Loading…' : 'Load'}
              onPress={loadAccounts}
              disabled={loadingList}
            />
          </View>

          {listErr ? <Tag tone="warning" label={`⚠ ${listErr}`} /> : null}
        </View>
      </Card>

      {/* ---------- Table header ---------- */}
      <View style={{ height: space.md }} />
      <Card style={{ paddingVertical: 8, paddingHorizontal: layout.cardPadding }}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={[text('label', t.colors.textSecondary), { flex: 1 }]}>Name</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 80, textAlign: 'right' }]}>Normal</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 120, textAlign: 'right' }]}>Balance USD</Text>
        </View>
      </Card>

      {/* ---------- Accounts list ---------- */}
      <Card style={{ paddingHorizontal: 0, paddingVertical: 0, marginTop: space.sm }}>
        {loadingList && rows.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {rows.map((item) => (
              <View key={item.id}>
                <Pressable
                  onPress={() => router.push({ pathname: '/account/[id]', params: { id: item.id, from, to } })}
                  android_ripple={{ color: t.colors.border as string }}
                  style={{ borderRadius: 10 }}
                  hitSlop={8}
                >
                  <View pointerEvents="none">
                    <ListItem
                      title={item.name}
                      subtitle={item.type ? `Type: ${item.type}` : undefined}
                      right={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                          <Text style={text('label', t.colors.textSecondary)}>
                            {item.normal_side?.toUpperCase?.() ?? ''}
                          </Text>
                          <Text style={text('label', t.colors.textPrimary)}>
                            ${money(item.balance_usd)}
                          </Text>
                        </View>
                      }
                    />
                  </View>
                </Pressable>
                <Divider />
              </View>
            ))}

            {rows.length === 0 && !loadingList ? (
              <View style={{ padding: layout.cardPadding }}>
                <Tag tone="neutral" label="No accounts found." />
              </View>
            ) : null}

            {/* footer total (client-side) */}
            {rows.length > 0 ? (
              <View style={{ paddingHorizontal: layout.cardPadding, paddingVertical: 12, alignItems: 'flex-end' }}>
                <Tag tone="info" label={`Total (USD): ${money(totalUsd)}`} />
              </View>
            ) : null}
          </>
        )}
      </Card>
    </View>
  );
}