import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, FlatList, TouchableOpacity, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Divider, Tag, ListItem } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type UserRow = {
  id: string;
  username: string;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
  active: boolean;
  shop_id: string;
  createdAt: string;
  updatedAt: string;
  Shop?: { id: string; name: string; slug?: string } | null;
};

export default function UsersIndexPage() {
  const { theme: t } = useTheme();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [role, setRole] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (q.trim()) u.set('q', q.trim());
    if (role) u.set('role', role);
    if (activeOnly) u.set('active', 'true');
    u.set('limit', '200');
    u.set('order', 'createdAt');
    u.set('dir', 'DESC');
    return u.toString();
  }, [q, role, activeOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/users?${qs}`, { headers: await authHeaders() });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j?.data || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load users');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { load(); }, [load]);

  const toneForRole = (r: string): 'danger'|'warning'|'info'|'neutral'|'success' => {
    if (r === 'owner') return 'danger';
    if (r === 'manager') return 'warning';
    if (r === 'cashier') return 'info';
    return 'neutral';
  };

  const header = (
    <View style={{ padding: layout.containerPadding, gap: space.sm }}>
      <Card>
        <Text style={text('h2', t.colors.textPrimary)}>Users</Text>
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
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by username…"
            placeholderTextColor={t.colors.textSecondary as string}
            autoCapitalize="none"
            style={{ flex: 1, color: t.colors.textPrimary }}
            returnKeyType="search"
            onSubmitEditing={load}
          />
          <Button title="Search" size="sm" onPress={load} />
        </View>

        {/* Filters */}
        <View style={{ height: space.sm }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {['', 'owner', 'manager', 'cashier', 'staff'].map((r) => (
            <Tag
              key={r || 'all'}
              label={r ? r : 'All roles'}
              tone={r ? (role === r ? toneForRole(r) : 'neutral') : (role === '' ? 'success' : 'neutral')}
              onPress={() => setRole((prev) => (prev === r ? '' : r))}
            />
          ))}
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={text('label', t.colors.textSecondary)}>Active only</Text>
            <Switch value={activeOnly} onValueChange={setActiveOnly} />
          </View>
        </View>

        <View style={{ height: space.sm }} />
        <Button title="+ New user" onPress={() => router.push('/users/new' as any)} />
      </Card>

      {/* Labels */}
      <Card>
        <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
          <Text style={[text('label', t.colors.textSecondary), { flex: 1 }]}>User</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 90 }]}>Role</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 70 }]}>Active</Text>
          <Text style={[text('label', t.colors.textSecondary), { width: 120 }]}>Created</Text>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      {loading && rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Loading…</Text>
        </View>
      ) : err ? (
        <View style={{ padding: layout.containerPadding }}>
          <Card><Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text></Card>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={header}
            renderItem={({ item }) => (
            <View>
                <Pressable
                onPress={() => router.push({ pathname: '/users/[id]', params: { id: item.id } })}
                android_ripple={{ color: t.colors.border as string }}
                style={{ borderRadius: 10 }}
                hitSlop={8}
                >
                <View pointerEvents="none">
                    <ListItem
                    title={item.username}
                    subtitle={item.Shop?.name ? `Shop: ${item.Shop.name}` : undefined}
                    right={
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Tag label={item.role} tone={toneForRole(item.role)} />
                        <Tag label={item.active ? 'Active' : 'Disabled'} tone={item.active ? 'success' : 'neutral'} />
                        </View>
                    }
                    meta={new Date(item.createdAt).toISOString().slice(0, 10)}
                    />
                </View>
                </Pressable>
                <Divider />
            </View>
            )}
          ItemSeparatorComponent={() => <View style={{ height: space.xs }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
