import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Tag } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const ROLES = ['owner', 'manager', 'cashier', 'staff'] as const;
type Role = typeof ROLES[number];

type UserDetail = {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function UserUpdatePage() {
  const { theme: t } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState(''); // optional

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Try direct endpoint if exists
        let data: UserDetail | null = null;
        let r = await fetch(`${API_BASE}/api/users/${id}`, { headers: await authHeaders() });
        if (r.ok) {
          const j = await r.json();
          if (j?.ok && j?.user) data = j.user;
        }
        // Fallback: list + find
        if (!data) {
          r = await fetch(`${API_BASE}/api/users?limit=200`, { headers: await authHeaders() });
          const j = await r.json();
          data = (j?.data || []).find((u: any) => u.id === id) || null;
        }
        if (!alive) return;
        if (!data) throw new Error('User not found');
        setUsername(data.username);
        setRole(data.role);
        setActive(Boolean(data.active));
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load user');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const canSave = useMemo(() => {
    if (username.trim().length < 3) return false;
    if (!ROLES.includes(role)) return false;
    if (password && password.length < 6) return false;
    return true;
  }, [username, role, password]);

  const toneForRole = (r: Role): 'danger'|'warning'|'info'|'neutral'|'success' => {
    if (r === 'owner') return 'danger';
    if (r === 'manager') return 'warning';
    if (r === 'cashier') return 'info';
    return 'neutral';
  };

  const save = async () => {
    try {
      setLoading(true);
      const body: any = { username: username.trim(), role, active };
      if (password) body.password = password;

      const r = await fetch(`${API_BASE}/api/users/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      Alert.alert('Saved', 'User updated', [{ text: 'OK', onPress: () => router.replace(`/users/${id}` as any) }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      {loading && !err ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator /><Text style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}>Loading…</Text>
        </View>
      ) : err ? (
        <View style={{ padding: layout.containerPadding }}>
          <Card><Text style={text('body', t.colors.danger.base)}>⚠️ {err}</Text></Card>
        </View>
      ) : (
        <View style={{ padding: layout.containerPadding, gap: space.md }}>
          <Card>
            <Text style={text('h2', t.colors.textPrimary)}>Update User</Text>

            <View style={{ height: space.sm }} />
            <Text style={text('label', t.colors.textSecondary)}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              style={{
                borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              }}
            />

            <View style={{ height: space.sm }} />
            <Text style={text('label', t.colors.textSecondary)}>Role</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ROLES.map((r) => (
                <Tag key={r} label={r} tone={role === r ? toneForRole(r) : 'neutral'} onPress={() => setRole(r)} />
              ))}
            </View>

            <View style={{ height: space.sm }} />
            <Text style={text('label', t.colors.textSecondary)}>Password (optional)</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Leave blank to keep"
              autoCapitalize="none"
              secureTextEntry
              style={{
                borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
                paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              }}
            />

            <View style={{ height: space.sm }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={text('label', t.colors.textSecondary)}>Active</Text>
              <Switch value={active} onValueChange={setActive} />
            </View>

            <View style={{ height: space.md }} />
            <Button title="Save changes" onPress={save} disabled={!canSave || loading} />
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}
