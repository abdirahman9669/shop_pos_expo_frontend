import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Divider, Tag } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ──────────────────────────────────────────────────────────────────────────────

const SHOP_ID = '11111111-1111-4111-8111-111111111111';

type Session = {
  id: string;
  shop_id: string;
  device_id: string;
  opened_by: string;
  opened_at: string;
  opening_cash_usd: number | string | null;
  opening_cash_sos: number | string | null;
  closed_at: string | null;
  closing_cash_usd?: number | string | null;
  closing_cash_sos?: number | string | null;
  createdAt?: string;
};

const fmtDT = (s?: string | null) =>
  s ? s.slice(0, 19).replace('T', ' ') : '—';

// ──────────────────────────────────────────────────────────────────────────────

export default function CashSessionsIndex() {
  const { theme: t } = useTheme();
  const router = useRouter();

  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pulling = useRef(false);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        shop_id: SHOP_ID,
        ...(onlyOpen ? { open: '1' } : {}),
      }).toString();

      const r = await fetch(`${API_BASE}/api/cash-sessions?${qs}`, {
        headers: await authHeaders(),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      // API returns either array or {data}
      const data: Session[] = Array.isArray(j) ? j : (j?.data ?? []);
      setRows(data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load sessions');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      pulling.current = false;
    }
  }, [onlyOpen]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    if (pulling.current) return;
    pulling.current = true;
    setRefreshing(true);
    load();
  }, [load]);

  const openNew = () => router.push('/cash-sessions/new' as const);
  const openDetail = (id: string) =>
    router.push({ pathname: '/cash-sessions/[id]' as const, params: { id } });

  // List header (Filter card)
  const listHeader = useMemo(() => (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={text('h3', t.colors.textPrimary)}>Filter</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={text('label', t.colors.textSecondary)}>Open only</Text>
          <Switch value={onlyOpen} onValueChange={setOnlyOpen} />
        </View>
      </View>
      {!!err && (
        <>
          <View style={{ height: space.sm }} />
          <Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text>
        </>
      )}
    </Card>
  ), [onlyOpen, err, t.colors]);

  // Render one session
  const renderItem = ({ item }: { item: Session }) => {
    const isOpen = !item.closed_at;
    const openingUsd = Number(item.opening_cash_usd ?? 0);
    const openingSos = Number(item.opening_cash_sos ?? 0);

    return (
      <TouchableOpacity onPress={() => openDetail(item.id)} activeOpacity={0.85}>
        <Card style={{ padding: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={text('h3', t.colors.textPrimary)} numberOfLines={1}>
              Session {item.id.slice(0, 8)}
            </Text>
            <Tag
              label={isOpen ? 'OPEN' : 'CLOSED'}
              tone={isOpen ? 'success' : 'warning'}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>

          <View style={{ height: space.xs }} />
          <Text style={text('label', t.colors.textSecondary)}>
            Device:{' '}
            <Text style={text('body', t.colors.textPrimary)}>{item.device_id?.slice(0, 8) || '—'}</Text>
          </Text>

          <Text style={text('label', t.colors.textSecondary)}>
            Opened:{' '}
            <Text style={text('body', t.colors.textPrimary)}>{fmtDT(item.opened_at)}</Text>
          </Text>

          {!isOpen && (
            <Text style={text('label', t.colors.textSecondary)}>
              Closed:{' '}
              <Text style={text('body', t.colors.textPrimary)}>{fmtDT(item.closed_at)}</Text>
            </Text>
          )}

          <Text style={text('label', t.colors.textSecondary)}>
            Opening (USD/SOS):{' '}
            <Text style={text('body', t.colors.textPrimary)}>
              {openingUsd.toFixed(2)} / {openingSos.toLocaleString()}
            </Text>
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  // ── Render
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: space.sm }}>
      {loading && rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={[text('caption', t.colors.textSecondary), { marginTop: 8 }]}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.colors.textSecondary as string}
              colors={[t.colors.primary.base as string]}
              progressBackgroundColor={t.colors.surface as string}
              progressViewOffset={0}
            />
          }
          // ⬇️ IMPORTANT: no extra top padding — shell already leaves room for header
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: 80, // leave a little room above footer + FAB
            paddingHorizontal: layout.containerPadding,
            gap: space.sm,
          }}
        />
      )}

      {/* Floating "+ Open" button (Shell hides native header buttons) */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: layout.containerPadding,
          bottom: 90, // above the shared footer
        }}
      >
        <Button title="+ Open session" onPress={openNew} />
      </View>
    </View>
  );
}