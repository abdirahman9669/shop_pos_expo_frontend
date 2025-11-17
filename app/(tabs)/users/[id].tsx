import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout } from '@/src/theme';
import { Card, Button, Divider, Tag, ListItem } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type UserDetail = {
  id: string;
  username: string;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
  active: boolean;
  shop_id: string;
  createdAt: string;
  updatedAt: string;
  Shop?: { id: string; name: string; slug?: string } | null;
};

export default function UserDetailPage() {
  const { theme: t } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [row, setRow] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Try GET /api/users/:id (if you add it later)
        let data: UserDetail | null = null;
        let r = await fetch(`${API_BASE}/api/users/${id}`, { headers: await authHeaders() });
        if (r.ok) {
          const j = await r.json();
          if (j?.ok && j?.user) data = j.user;
        }
        // Fallback: pull list and find
        if (!data) {
          r = await fetch(`${API_BASE}/api/users?limit=200`, { headers: await authHeaders() });
          const j = await r.json();
          const found = (j?.data || []).find((u: any) => u.id === id);
          data = found || null;
        }
        if (alive) setRow(data);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load user');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const toneForRole = (r?: string): 'danger'|'warning'|'info'|'neutral'|'success' => {
    if (r === 'owner') return 'danger';
    if (r === 'manager') return 'warning';
    if (r === 'cashier') return 'info';
    return 'neutral';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator /><Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Loading…</Text>
        </View>
      ) : err ? (
        <View style={{ padding: layout.containerPadding }}>
          <Card><Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text></Card>
        </View>
      ) : !row ? (
        <View style={{ padding: layout.containerPadding }}>
          <Card><Text style={text('body', t.colors.textSecondary)}>User not found.</Text></Card>
        </View>
      ) : (
        <View style={{ padding: layout.containerPadding, gap: space.md }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={text('h2', t.colors.textPrimary)}>{row.username}</Text>
              <Button title="Update" onPress={() => router.push({ pathname: '/users/update', params: { id: row.id } })} />
            </View>
            <View style={{ height: space.sm }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Tag label={row.role} tone={toneForRole(row.role)} />
              <Tag label={row.active ? 'Active' : 'Disabled'} tone={row.active ? 'success' : 'neutral'} />
            </View>
            <View style={{ height: space.md }} />
            <Divider />
            <ListItem title="Shop" meta={row.Shop?.name || row.shop_id} />
            <Divider />
            <ListItem title="Created" meta={new Date(row.createdAt).toLocaleString()} />
            <Divider />
            <ListItem title="Updated" meta={new Date(row.updatedAt).toLocaleString()} />
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}
